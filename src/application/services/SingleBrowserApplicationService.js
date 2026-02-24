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

import {SingleBrowserManager} from '../../domain/services/SingleBrowserManager.js';
import {JobScheduler} from '../../domain/services/JobScheduler.js';
import {EventBus} from '../../domain/services/EventBus.js';
import {resourceMonitor} from '../../domain/services/ResourceMonitor.js';
import {PlaywrightBrowserAdapter} from '../../infrastructure/adapters/PlaywrightBrowserAdapter.js';
import {InMemoryJobQueue} from '../../infrastructure/adapters/InMemoryJobQueue.js';
import {ScrapingService} from './ScrapingService.js';
import {SubmitScrapingJob} from '../use-cases/SubmitScrapingJob.js';
import {GetSystemStatus} from '../use-cases/GetSystemStatus.js';
import {logger} from '../../infrastructure/interfaces/Logger.js';
import {MetricsCollector} from '../../infrastructure/interfaces/MetricsCollector.js';
import {BrowserConfig} from '../../domain/value-objects/BrowserConfig.js';

/**
 * Single Browser Architecture Application Service
 *
 * Реализация § 5.3 из playwright_context_architecture.md
 * - ОДИН Browser instance
 * - N = CPU_CORES × 4 контекстов
 * - Context Pool с ротацией каждые 50 страниц
 * - Semaphore для контроля concurrency
 *
 * Ожидаемая производительность (§6):
 * - Throughput: +40% vs Browser Pool
 * - Memory: -40% vs Browser Pool
 * - Context create: 500x faster (1ms vs 500ms)
 */
export class SingleBrowserApplicationService {
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
            jobDurations: [],
            maxDurationHistory: 100
        };

        // Initialize infrastructure
        this.jobQueue = new InMemoryJobQueue();

        // Initialize browser adapter
        this.browserAdapter = new PlaywrightBrowserAdapter();

        // § 2: Single Browser Manager (вместо BrowserPoolManager)
        this.singleBrowserManager = new SingleBrowserManager(this.browserAdapter, {
            contextsPerCore: config.singleBrowser?.contextsPerCore || 4,
            maxContexts: config.singleBrowser?.maxContexts
        });

        // Initialize application services
        this.scrapingService = new ScrapingService(this.browserAdapter);

        // Initialize domain services
        this.jobScheduler = new JobScheduler(
            this.singleBrowserManager, // Используем SingleBrowserManager
            this.jobQueue,
            this.scrapingService,
            this.eventBus
        );

        // Initialize use cases
        this.submitScrapingJob = new SubmitScrapingJob(this.jobScheduler);
        this.getSystemStatus = new GetSystemStatus(this.jobScheduler, this.singleBrowserManager);

        // Set up event handlers
        this._setupEventHandlers();

        logger.info('📦 SingleBrowserApplicationService initialized (§5.3 architecture)');
    }

    async start() {
        console.log('🚀 Starting Single Browser Application Service...');

        try {
            // § 5.3: Оптимизированная конфигурация для single browser
            const browserConfig = BrowserConfig.forSingleBrowserArchitecture();

            // § 3: ИНИЦИАЛИЗАЦИЯ - Запуск единственного браузера
            await this.singleBrowserManager.initialize(browserConfig);

            const stats = this.singleBrowserManager.getStats();
            logger.info(`✅ Initialized single browser with ${stats.contextPool.maxSize} context slots`);

            await this.jobScheduler.start();
            logger.info('✅ Job scheduler started');

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

            // Log theoretical performance (§6)
            this._logTheoreticalPerformance();

            logger.info('🎉 Single Browser Application Service started successfully');
        } catch (error) {
            logger.error('❌ Failed to start Single Browser Application Service:', error);
            await this.shutdown();
            throw error;
        }
    }

    async shutdown() {
        if (this.isShuttingDown) {
            logger.debug('Shutdown already in progress, skipping duplicate shutdown call');
            return;
        }

        logger.info('🛑 Shutting down Single Browser Application Service...');
        this.isShuttingDown = true;

        // Disable watchdog during shutdown
        this.browserAdapter.setShuttingDown(true);

        try {
            this._stopHealthChecks();

            await this.jobScheduler.stop();
            logger.info('✅ Job scheduler stopped');

            await this.singleBrowserManager.shutdown();
            logger.info('✅ Single browser manager shut down');

            // Stop resource monitoring
            this.resourceMonitor.stopMonitoring();

            logger.info('✅ Single Browser Application Service shut down successfully');
        } catch (error) {
            logger.error('❌ Error during shutdown:', error);
        }
    }

    // Public API methods
    async submitJob(url, options = {}) {
        return await this.submitScrapingJob.execute(url, options);
    }

    async getStatus() {
        const singleBrowserStats = this.singleBrowserManager.getStats();
        const schedulerStatus = this.jobScheduler.getStatus();
        const metrics = this.metrics.getMetrics();
        const resources = this.resourceMonitor.getSystemSummary();
        const rawResources = await this.resourceMonitor.getMetrics();

        // Calculate health metrics
        const successRate = this.getSuccessRate();
        const p95Duration = this.getP95Duration();

        const health = {
            queueDepth: schedulerStatus.queuedJobs,
            activeJobs: schedulerStatus.activeJobs,
            successRate: Math.round(successRate * 100) / 100,
            p95Duration: Math.round(p95Duration),
            totalJobs: this.healthMetrics.totalJobs,
            completedJobs: this.healthMetrics.completedJobs,
            failedJobs: this.healthMetrics.failedJobs,
            canceledJobs: this.healthMetrics.canceledJobs
        };

        // § 6: Расчет теоретического throughput
        const avgDuration = p95Duration || 1200; // Default 1.2s
        const theoreticalThroughput = this.singleBrowserManager.calculateThroughput(avgDuration);

        return {
            architecture: 'single-browser', // Флаг архитектуры
            browser: singleBrowserStats.browser,
            contextPool: singleBrowserStats.contextPool,
            semaphore: singleBrowserStats.semaphore,
            health,
            metrics,
            resources,
            rawResources,
            scheduler: schedulerStatus,
            performance: {
                avgDurationMs: avgDuration,
                theoreticalThroughput: theoreticalThroughput.toFixed(2) + ' URLs/сек',
                perMinute: Math.round(theoreticalThroughput * 60) + ' URLs/мин',
                perHour: Math.round(theoreticalThroughput * 3600) + ' URLs/час'
            }
        };
    }

    getMetrics() {
        return this.metrics.getMetrics();
    }

    async drain() {
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

    /**
     * § 6: Log theoretical performance based on mathematical model
     */
    _logTheoreticalPerformance() {
        const stats = this.singleBrowserManager.getStats();
        const maxContexts = stats.contextPool.maxSize;

        // Assuming average 1.2s per URL (from § 6)
        const avgTimeMs = 1200;
        const throughput = this.singleBrowserManager.calculateThroughput(avgTimeMs);

        logger.info('\n📊 THEORETICAL PERFORMANCE (§6):');
        logger.info(`   Max contexts (N):  ${maxContexts}`);
        logger.info(`   Avg time (T):      ${avgTimeMs}ms`);
        logger.info(`   Throughput:        ${throughput.toFixed(2)} URLs/сек`);
        logger.info(`   Per minute:        ${Math.round(throughput * 60)} URLs/мин`);
        logger.info(`   Per hour:          ${Math.round(throughput * 3600)} URLs/час`);
        logger.info('');
    }

    // Event handling
    _setupEventHandlers() {
        // Handle browser crashes
        this.eventBus.subscribe('BrowserCrashed', async (event) => {
            logger.warn(`⚠️ Browser ${event.aggregateId} crashed, affected jobs:`, event.data.affectedJobs);
            this.metrics.recordBrowserRestart();
            // В single browser архитектуре это критично - нужен перезапуск всего браузера
            logger.error('❌ CRITICAL: Single browser crashed - service will need restart');
        });

        this.eventBus.subscribe('JobCompleted', (event) => {
            logger.info(`✅ Job ${event.aggregateId} completed in ${event.data.result.duration}ms`);
            this.metrics.recordJobCompleted(event.data.result.duration);

            this.healthMetrics.completedJobs++;
            this.healthMetrics.jobDurations.push(event.data.result.duration);
            if (this.healthMetrics.jobDurations.length > this.healthMetrics.maxDurationHistory) {
                this.healthMetrics.jobDurations.shift();
            }
        });

        this.eventBus.subscribe('JobFailed', (event) => {
            logger.error(`❌ Job ${event.aggregateId} failed: ${event.data.error}`);
            this.metrics.recordJobFailed(new Error(event.data.error));
            this.healthMetrics.failedJobs++;
        });

        this.eventBus.subscribe('JobCanceled', (event) => {
            logger.info(`🚫 Job ${event.aggregateId} canceled`);
            this.healthMetrics.canceledJobs++;
        });

        this.eventBus.subscribe('JobQueued', (event) => {
            logger.info(`📋 Job ${event.aggregateId} queued for ${event.data.url}`);
            this.metrics.recordJobSubmitted();
            this.healthMetrics.totalJobs++;
        });

        this.eventBus.subscribe('JobStarted', (event) => {
            logger.info(`▶️ Job ${event.aggregateId} started on context ${event.data.browserId}`);
        });

        this.eventBus.subscribe('ContextCreated', (event) => {
            logger.debug(`🔧 Context ${event.aggregateId} created`);
            this.metrics.recordContextCreated();
        });

        this.eventBus.subscribe('ContextClosed', (event) => {
            logger.debug(`🔒 Context ${event.aggregateId} closed`);
        });
    }

    // Health check method
    async healthCheck() {
        const status = await this.getStatus();
        const healthy = this.singleBrowserManager.isHealthy();

        return {
            healthy,
            status,
            timestamp: new Date()
        };
    }

    _startHealthChecks() {
        // Periodic context rotation check every 60 seconds
        this.healthCheckInterval = setInterval(async () => {
            try {
                const stats = this.singleBrowserManager.getStats();

                // Check if contexts need rotation
                const needsRotation = stats.contextPool.contexts.some(ctx => ctx.needsRotation);
                if (needsRotation) {
                    logger.info('🔄 Some contexts need rotation, triggering cleanup...');
                    // Context pool автоматически ротирует при acquire
                }

                // Log context pool stats
                logger.debug(`Context pool: ${stats.contextPool.available} available, ${stats.contextPool.inUse} in use`);
            } catch (error) {
                logger.error('❌ Health check failed:', error);
            }
        }, 60000);

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
