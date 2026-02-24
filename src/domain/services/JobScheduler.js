/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-24 23:49
 * Last Updated: 2026-02-24 23:49
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

import {ScrapingSession} from '../aggregates/ScrapingSession.js';
import {BrowserContext} from '../entities/BrowserContext.js';
import {
    BrowserCrashed,
    ContextClosed,
    ContextCreated,
    JobCanceled,
    JobCompleted,
    JobFailed,
    JobQueued,
    JobStarted
} from '../events/DomainEvents.js';

// Error classification and retry policies
const ERROR_POLICIES = {
    // Permanent failures - don't retry
    'ERR_NAME_NOT_RESOLVED': {retryable: false, category: 'network_permanent'},
    'ERR_CERT_AUTHORITY_INVALID': {retryable: false, category: 'ssl_permanent'},
    'ERR_CERT_DATE_INVALID': {retryable: false, category: 'ssl_permanent'},

    // Retryable network errors
    'ERR_TIMED_OUT': {retryable: true, category: 'network_timeout', maxRetries: 3},
    'ERR_NETWORK_CHANGED': {retryable: true, category: 'network_transient', maxRetries: 2},
    'ERR_INTERNET_DISCONNECTED': {retryable: true, category: 'network_transient', maxRetries: 2},

    // HTTP errors
    '429': {retryable: true, category: 'rate_limit', maxRetries: 5, backoffMs: 1000},
    '503': {retryable: true, category: 'server_unavailable', maxRetries: 3, backoffMs: 2000},
    '502': {retryable: true, category: 'server_error', maxRetries: 2},
    '504': {retryable: true, category: 'server_timeout', maxRetries: 2},

    // Timeout errors
    'Timeout': {retryable: true, category: 'network_timeout', maxRetries: 2},

    // Expected interruptions
    'ERR_ABORTED': {retryable: false, category: 'interruption_expected'}
};

function classifyError(error) {
    const message = error.message || '';
    const code = error.code || '';

    // Check for HTTP status codes in message
    const httpMatch = message.match(/status (\d+)/);
    if (httpMatch) {
        return ERROR_POLICIES[httpMatch[1]] || {retryable: false, category: 'http_unknown'};
    }

    // Check for Playwright error codes
    for (const [errorCode, policy] of Object.entries(ERROR_POLICIES)) {
        if (message.includes(errorCode) || code === errorCode) {
            return policy;
        }
    }

    // Default: treat as retryable transient error
    return {retryable: true, category: 'unknown_transient', maxRetries: 1};
}

export class JobScheduler {
    constructor(browserManager, jobQueue, scraper, eventBus, options = {}) {
        // Support both BrowserPoolManager and SingleBrowserManager
        this.browserManager = browserManager;
        this.jobQueue = jobQueue;
        this.scraper = scraper;
        this.eventBus = eventBus;
        this.activeSessions = new Map(); // sessionId -> ScrapingSession
        this.isStopping = false;
        this.activeJobCount = 0;
        this.queuedJobCount = 0;
        this.inFlight = new Set(); // job IDs currently being processed
        this.pendingTerminalEvents = 0; // Track async terminal event processing

        // Performance optimization: make verbose logging optional
        this.verboseLogging = options.verboseLogging !== false;

        // Detect architecture type
        this.isSingleBrowser = this._isSingleBrowserManager(browserManager);
        if (this.isSingleBrowser) {
            console.log('📦 JobScheduler: Using Single Browser Architecture');
        } else {
            console.log('📦 JobScheduler: Using Browser Pool Architecture');
        }
    }

    /**
     * Detect if using SingleBrowserManager vs BrowserPoolManager
     */
    _isSingleBrowserManager(manager) {
        return typeof manager.acquireContext === 'function' &&
               typeof manager.releaseContext === 'function';
    }

    async start() {
        // Start processing jobs from the queue
        this._startJobProcessor();
    }

    async stop() {
        console.log('JobScheduler: Initiating graceful shutdown...');
        this.isStopping = true;

        // Wait for active jobs to complete with timeout
        const timeoutMs = 10000; // 10 seconds for testing
        const startTime = Date.now();

        while (this.activeJobCount > 0 && (Date.now() - startTime) < timeoutMs) {
            console.log(`JobScheduler: Waiting for ${this.activeJobCount} active jobs to complete...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (this.activeJobCount > 0) {
            console.warn(`JobScheduler: Timeout reached, force canceling ${this.activeJobCount} remaining jobs`);
            // Cancel remaining active sessions
            const cancelPromises = [];
            for (const session of this.activeSessions.values()) {
                cancelPromises.push(this._cancelSession(session));
            }
            await Promise.all(cancelPromises);
        }

        // Clear inFlight set
        this.inFlight.clear();

        console.log('JobScheduler: Graceful shutdown completed');
    }

    async submitJob(job) {
        await this.jobQueue.enqueue(job);
        console.log(`📋 Job ${job.id} lifecycle: queued → ${job.url}`);
        this.eventBus.publish(new JobQueued(job.id, job.url));
    }

    getActiveSessionsCount() {
        return this.activeSessions.size;
    }

    getQueuedJobsCount() {
        return this.jobQueue.size();
    }

    getActiveJobCount() {
        return this.activeJobCount;
    }

    getStatus() {
        return {
            activeJobs: this.activeJobCount,
            queuedJobs: this.jobQueue.size(),
            activeSessions: this.activeSessions.size,
            inFlightJobs: this.inFlight.size,
            isStopping: this.isStopping,
            pendingTerminalEvents: this.pendingTerminalEvents
        };
    }

    async drain() {
        // Wait for all terminal events to be processed
        while (this.pendingTerminalEvents > 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    async _startJobProcessor() {
        while (!this.isStopping) {
            let job = null;
            try {
                job = await this.jobQueue.dequeue();
                if (!job) {
                    // Queue is empty - if stopping, exit; otherwise wait before retrying
                    if (this.isStopping) break;

                    // Add small delay to prevent CPU spinning when queue is empty
                    // Use setImmediate for better event loop performance
                    await new Promise(resolve => setImmediate(resolve));
                    continue;
                }

                // Atomic protection: check if job is already being processed
                if (this.inFlight.has(job.id)) {
                    console.warn(`JobScheduler: Job ${job.id} already in flight, skipping duplicate processing`);
                    continue;
                }

                this.inFlight.add(job.id);
                this.activeJobCount++;
                await this._processJob(job);
                this.activeJobCount--;
                this.inFlight.delete(job.id);
            } catch (error) {
                console.error('Error in job processor:', error);
                this.activeJobCount = Math.max(0, this.activeJobCount - 1); // Ensure doesn't go negative
                // Remove from inFlight on error
                if (job) {
                    this.inFlight.delete(job.id);
                }
                // Continue processing other jobs
            }
        }
        console.log('JobScheduler: Job processor stopped');
    }

    async _processJob(job) {
        let browserId, contextId, context, browser;

        // § Single Browser Architecture vs Browser Pool Architecture
        if (this.isSingleBrowser) {
            // Single Browser: Acquire context from pool
            try {
                const acquired = await this.browserManager.acquireContext(job.id);
                contextId = acquired.contextId;
                browserId = acquired.browserId;
                // Context already exists, no need to create
            } catch (error) {
                console.error(`Failed to acquire context: ${error.message}`);
                await this.jobQueue.enqueue(job);
                return;
            }
        } else {
            // Browser Pool: Find browser and create context
            browser = this.browserManager.findAvailableBrowser();
            if (!browser) {
                // No available browser, re-queue the job
                await this.jobQueue.enqueue(job);
                return;
            }
            browserId = browser.id;
        }

        // Check if job is still pending before doing anything
        if (job.status !== 'completed' && job.status !== 'failed') {
            // Optimize: Reuse timestamp, avoid string concatenation in hot path
            const timestamp = Date.now();

            if (!this.isSingleBrowser) {
                // Browser Pool: Create context
                contextId = `ctx-${job.id}-${timestamp}`;
                await this.browserManager.createContext(browserId, contextId, job.id);
                this.eventBus.publish(new ContextCreated(contextId, browserId, job.id));
            }

            context = new BrowserContext(contextId, browserId, job.id);
            let session = null;

            try {
                // Context already created (Single Browser) or just created (Browser Pool)
                if (!this.isSingleBrowser) {
                    // Only publish for Browser Pool (Single Browser publishes differently)
                    this.eventBus.publish(new ContextCreated(contextId, browserId, job.id));
                }

                // Create session
                session = new ScrapingSession(job, context);
                this.activeSessions.set(session.id, session);

                // Mark job as running
                job.markAsRunning();
                console.log(`▶️ Job ${job.id} lifecycle: started → browser ${browserId}`);
                this.eventBus.publish(new JobStarted(job.id, browserId));

                // Execute scraping
                // Pass browserManager for Single Browser architecture
                const result = await this.scraper.scrape(job, browserId, contextId,
                    this.isSingleBrowser ? this.browserManager : null);

                // Complete job
                job.markAsCompleted(result);
                console.log(`✅ Job ${job.id} lifecycle: completed → ${result.duration}ms`);
                this.eventBus.publish(new JobCompleted(job.id, result));

            } catch (error) {
                // Classify the error to determine appropriate handling
                const errorPolicy = classifyError(error);
                const isAborted = error.message?.includes('ERR_ABORTED') || error.name === 'AbortError';
                const isExpectedInterruption = isAborted && (this.isStopping || job.isCanceled());

                if (isExpectedInterruption) {
                    // This is expected behavior during shutdown/cancel - log as info, not error
                    this.pendingTerminalEvents++;
                    try {
                        console.log(`🚫 Job ${job.id} lifecycle: aborted → expected interruption (${error.message})`);
                    } finally {
                        this.pendingTerminalEvents--;
                    }
                    // Don't mark as failed - job should already be canceled by the shutdown process
                } else if (job.isTerminal()) {
                    // Job already has terminal status - don't change it or log error
                    console.log(`⏭️ Job ${job.id} lifecycle: terminal (${job.status}) - ignoring late error: ${error.message}`);
                } else {
                    // Handle based on error classification
                    if (errorPolicy.retryable && job.canRetry(errorPolicy.maxRetries)) {
                        console.log(`🔄 Job ${job.id} lifecycle: failed → retry (${errorPolicy.category}: ${error.message})`);
                        job.markAsFailed(error);
                        await this.jobQueue.enqueue(job);
                    } else {
                        // Permanent failure - track the logging itself
                        this.pendingTerminalEvents++;
                        try {
                            console.error(`❌ Job ${job.id} lifecycle: failed → permanent (${errorPolicy.category}: ${error.message})`);
                        } finally {
                            this.pendingTerminalEvents--;
                        }
                        job.markAsFailed(error);
                        this.eventBus.publish(new JobFailed(job.id, error));
                    }
                }
            } finally {
                // Always cleanup context
                try {
                    if (this.isSingleBrowser) {
                        // Single Browser: Release context back to pool (don't close it)
                        this.browserManager.releaseContext(contextId);
                        this.eventBus.publish(new ContextClosed(contextId, browserId, job.id));
                    } else {
                        // Browser Pool: Close context
                        await this.browserManager.closeContext(browserId, contextId);
                        this.eventBus.publish(new ContextClosed(contextId, browserId, job.id));
                    }
                } catch (cleanupError) {
                    console.error(`Error cleaning up context ${contextId}:`, cleanupError);
                }

                // Remove session
                if (session) {
                    this.activeSessions.delete(session.id);
                }
            }
        } else {
            console.log(`⏭️ Job ${job.id} lifecycle: skipped → already ${job.status}`);
        }
    }

    async _cancelSession(session) {
        try {
            await this.browserPoolManager.closeContext(session.context.browserId, session.context.id);
            session.job.markAsCanceled();
            this.eventBus.publish(new JobCanceled(session.job.id));
        } catch (error) {
            console.error(`Error cancelling session ${session.id}:`, error);
        }
    }

    async handleBrowserCrash(browserId) {
        const affectedSessions = [];

        // Find all sessions using this browser
        for (const [sessionId, session] of this.activeSessions) {
            if (session.context.browserId === browserId) {
                affectedSessions.push(session);
            }
        }

        // Cancel affected sessions
        const cancelPromises = affectedSessions.map(session => this._cancelSession(session));
        await Promise.all(cancelPromises);

        // Remove affected sessions
        affectedSessions.forEach(session => {
            this.activeSessions.delete(session.id);
        });

        // Publish crash event
        this.eventBus.publish(new BrowserCrashed(browserId, affectedSessions.map(s => s.job.id)));

        // Trigger browser restart
        await this.browserPoolManager.restartBrowser(browserId);
        this.eventBus.publish(new BrowserRestarted(browserId));
    }
}