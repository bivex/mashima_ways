/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-24 23:50
 * Last Updated: 2026-02-24 23:50
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

import {BrowserPoolManager} from '../../domain/services/BrowserPoolManager.js';
import {JobScheduler} from '../../domain/services/JobScheduler.js';
import {EventBus} from '../../domain/services/EventBus.js';
import {resourceMonitor} from '../../domain/services/ResourceMonitor.js';
import {PlaywrightBrowserAdapter} from '../../infrastructure/adapters/PlaywrightBrowserAdapter.js';
import {InMemoryJobQueue} from '../../infrastructure/adapters/InMemoryJobQueue.js';
import {ScrapingService} from './ScrapingService.js';
import {BrowserPoolService} from './BrowserPoolService.js';
import {SubmitScrapingJob} from '../use-cases/SubmitScrapingJob.js';
import {GetSystemStatus} from '../use-cases/GetSystemStatus.js';
import {logger} from '../../infrastructure/interfaces/Logger.js';
import {MetricsCollector} from '../../infrastructure/interfaces/MetricsCollector.js';

export class ScrapingApplicationService {
    constructor(config) {
        this.config = config;
        this.eventBus = new EventBus();
        this.metrics = new MetricsCollector();
        this.resourceMonitor = resourceMonitor;
        this.isShuttingDown = false;

        // Health metrics tracking
        this.healthMetrics = {
            totalJobs: 0,
            completedJobs: 0,
            failedJobs: 0,
            canceledJobs: 0,
            jobDurations: [], // Keep last 100 durations for p95 calculation
            maxDurationHistory: 100
        };

        // Initialize infrastructure
        this.jobQueue = new InMemoryJobQueue();

        // Initialize browser adapter (will set pool manager reference later)
        this.browserAdapter = new PlaywrightBrowserAdapter();

        // Initialize domain services
        this.browserPoolManager = new BrowserPoolManager(this.browserAdapter, {
            jobQueue: this.jobQueue, // For smart backpressure
            poolSize: config.browser.poolSize,
            maxContextsPerBrowser: config.browser.maxContextsPerBrowser,
            globalMaxConcurrency: config.browser.globalMaxConcurrency,
            rotateUserAgents: config.browser.rotateUserAgents,
            queueBackpressureThreshold: config.browser.queueBackpressureThreshold,
            backpressureReductionFactor: config.browser.backpressureReductionFactor
        });

        // Set reference for watchdog functionality
        this.browserAdapter.browserPoolManager = this.browserPoolManager;

        // Initialize application services
        this.scrapingService = new ScrapingService(this.browserAdapter);
        this.browserPoolService = new BrowserPoolService(this.browserPoolManager, config);

        // Initialize domain services that depend on application services
        this.jobScheduler = new JobScheduler(
            this.browserPoolManager,
            this.jobQueue,
            this.scrapingService,
            this.eventBus
        );

        // Initialize use cases
        this.submitScrapingJob = new SubmitScrapingJob(this.jobScheduler);
        this.getSystemStatus = new GetSystemStatus(this.jobScheduler, this.browserPoolManager);

        // Set up event handlers
        this._setupEventHandlers();
    }

    async start() {
        console.log('Starting Scraping Application Service...');

        try {
            await this.browserPoolService.initialize();
            logger.info(`Initialized ${this.config.browser.poolSize} browser instances`);

            await this.jobScheduler.start();
            logger.info('Job scheduler started');

            // Start periodic health checks
            this._startHealthChecks();

            // Start resource monitoring
            this.resourceMonitor.startMonitoring((metrics, recommendations) => {
                if (recommendations.length > 0) {
                    logger.warn('⚠️ System resource alerts:', recommendations.map(r => r.message));
                }

                // Log system summary every 5 minutes
                const now = Date.now();
                if (!this.lastResourceLog || now - this.lastResourceLog > 5 * 60 * 1000) {
                    const summary = this.resourceMonitor.getSystemSummary();
                    logger.info('🖥️ System resources:', summary);
                    this.lastResourceLog = now;
                }
            });

            logger.info('Scraping Application Service started successfully');
        } catch (error) {
            logger.error('Failed to start Scraping Application Service:', error);
            await this.shutdown();
            throw error;
        }
    }

    async shutdown() {
        if (this.isShuttingDown) {
            logger.debug('Shutdown already in progress, skipping duplicate shutdown call');
            return;
        }

        logger.info('Shutting down Scraping Application Service...');
        this.isShuttingDown = true;

        // Disable watchdog during shutdown
        this.browserAdapter.setShuttingDown(true);

        try {
            this._stopHealthChecks();

            await this.jobScheduler.stop();
            logger.info('Job scheduler stopped');

            await this.browserPoolService.shutdown();
            logger.info('Browser pool shut down');

            // Stop resource monitoring
            this.resourceMonitor.stopMonitoring();

            logger.info('Scraping Application Service shut down successfully');
        } catch (error) {
            logger.error('Error during shutdown:', error);
        }
    }

    // Public API methods
    async submitJob(url, options = {}) {
        return await this.submitScrapingJob.execute(url, options);
    }

    async getStatus() {
        const systemStatus = await this.getSystemStatus.execute();
        const metrics = this.metrics.getMetrics();
        const resources = this.resourceMonitor.getSystemSummary();
        const rawResources = await this.resourceMonitor.getMetrics();
        const schedulerStatus = this.jobScheduler.getStatus();

        // Calculate health metrics
        const successRate = this.getSuccessRate();
        const p95Duration = this.getP95Duration();

        const health = {
            queueDepth: schedulerStatus.queuedJobs,
            activeJobs: schedulerStatus.activeJobs,
            successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
            p95Duration: Math.round(p95Duration),
            totalJobs: this.healthMetrics.totalJobs,
            completedJobs: this.healthMetrics.completedJobs,
            failedJobs: this.healthMetrics.failedJobs,
            canceledJobs: this.healthMetrics.canceledJobs
        };

        return {
            ...systemStatus,
            metrics,
            resources,
            rawResources,
            health,
            scheduler: schedulerStatus
        };
    }

    getMetrics() {
        return this.metrics.getMetrics();
    }

    async drain() {
        // Wait for all terminal events to be fully processed
        await this.jobScheduler.drain();
    }

    /**
     * Calculate success rate (completed / total jobs)
     */
    getSuccessRate() {
        const {completedJobs, failedJobs} = this.healthMetrics;
        const processedJobs = completedJobs + failedJobs;
        return processedJobs > 0 ? completedJobs / processedJobs : 0;
    }

    /**
     * Calculate p95 duration from recent jobs
     */
    getP95Duration() {
        const durations = this.healthMetrics.jobDurations;
        if (durations.length === 0) return 0;

        const sorted = [...durations].sort((a, b) => a - b);
        const index = Math.ceil(0.95 * sorted.length) - 1;
        return sorted[index];
    }

    // Event handling
    _setupEventHandlers() {
        // Handle browser crashes
        this.eventBus.subscribe('BrowserCrashed', async (event) => {
            logger.warn(`Browser ${event.aggregateId} crashed, affected jobs:`, event.data.affectedJobs);
            this.metrics.recordBrowserRestart();
            await this.jobScheduler.handleBrowserCrash(event.aggregateId);
        });

        // Log other events and collect metrics
        this.eventBus.subscribe('JobCompleted', (event) => {
            logger.info(`Job ${event.aggregateId} completed in ${event.data.result.duration}ms`);
            this.metrics.recordJobCompleted(event.data.result.duration);

            // Update health metrics
            this.healthMetrics.completedJobs++;
            this.healthMetrics.jobDurations.push(event.data.result.duration);
            if (this.healthMetrics.jobDurations.length > this.healthMetrics.maxDurationHistory) {
                this.healthMetrics.jobDurations.shift();
            }
        });

        this.eventBus.subscribe('JobFailed', (event) => {
            logger.error(`Job ${event.aggregateId} failed: ${event.data.error}`);
            this.metrics.recordJobFailed(new Error(event.data.error));

            // Update health metrics
            this.healthMetrics.failedJobs++;
        });

        this.eventBus.subscribe('JobCanceled', (event) => {
            logger.info(`Job ${event.aggregateId} canceled`);

            // Update health metrics
            this.healthMetrics.canceledJobs++;
        });

        this.eventBus.subscribe('JobQueued', (event) => {
            logger.info(`Job ${event.aggregateId} queued for ${event.data.url}`);
            this.metrics.recordJobSubmitted();

            // Update health metrics
            this.healthMetrics.totalJobs++;
        });

        this.eventBus.subscribe('JobStarted', (event) => {
            logger.info(`Job ${event.aggregateId} started on browser ${event.data.browserId}`);
        });

        this.eventBus.subscribe('BrowserRestarted', (event) => {
            logger.info(`Browser ${event.aggregateId} restarted`);
        });

        this.eventBus.subscribe('ContextCreated', (event) => {
            logger.debug(`Context ${event.aggregateId} created for browser ${event.data.browserId}`);
            this.metrics.recordContextCreated();
        });

        this.eventBus.subscribe('ContextClosed', (event) => {
            logger.debug(`Context ${event.aggregateId} closed for browser ${event.data.browserId}`);
        });
    }

    // Health check method
    async healthCheck() {
        const status = await this.getStatus();
        const healthy = status.browsers &&
            Object.values(status.browsers).every(b => b.status === 'running');

        return {
            healthy,
            status,
            timestamp: new Date()
        };
    }

    _startHealthChecks() {
        // Periodic health check every 30 seconds
        this.healthCheckInterval = setInterval(async () => {
            try {
                const healthResult = await this.browserPoolManager.healthCheck();
                if (healthResult.restarted > 0) {
                    logger.warn(`Health check: restarted ${healthResult.restarted} crashed browsers`);
                }
            } catch (error) {
                logger.error('Health check failed:', error);
            }
        }, 30000);

        // Periodic metrics logging every 60 seconds
        this.metricsInterval = setInterval(() => {
            this.metrics.logMetrics();
        }, 60000);
    }

    _stopHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }
    }
}