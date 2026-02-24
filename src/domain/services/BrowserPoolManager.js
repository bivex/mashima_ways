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

import {Browser} from '../entities/Browser.js';
import {BrowserConfig} from '../value-objects/BrowserConfig.js';

import {userAgentManager} from './UserAgentManager.js';
import {resourceMonitor} from './ResourceMonitor.js';

export class BrowserPoolManager {
    constructor(browserAdapter, config = {}) {
        this.browserAdapter = browserAdapter;
        this.jobQueue = config.jobQueue; // Reference to job queue for backpressure
        this.browsers = new Map(); // browserId -> Browser
        this.poolSize = config.poolSize || 5;
        this.maxContextsPerBrowser = config.maxContextsPerBrowser || 50;
        this.globalMaxConcurrency = config.globalMaxConcurrency || 250;
        this.activeJobs = 0;
        this.rotateUserAgents = config.rotateUserAgents !== false; // Включено по умолчанию

        // Smart backpressure settings
        this.queueBackpressureThreshold = config.queueBackpressureThreshold || 50; // Queue depth threshold
        this.backpressureReductionFactor = config.backpressureReductionFactor || 0.7; // Reduce to 70% when queue grows
    }

    async initialize() {
        const config = BrowserConfig.default();

        for (let i = 0; i < this.poolSize; i++) {
            const browserId = `browser-${i}`;
            const browser = new Browser(browserId, config);
            browser.maxContexts = this.maxContextsPerBrowser;

            try {
                await this.browserAdapter.launchBrowser(browserId, config);
                browser.markAsRunning();
                this.browsers.set(browserId, browser);
            } catch (error) {
                console.error(`Failed to launch browser ${browserId}:`, error);
                browser.markAsStopped();
                this.browsers.set(browserId, browser);
            }
        }
    }

    async shutdown() {
        const shutdownPromises = [];
        for (const [browserId, browser] of this.browsers) {
            shutdownPromises.push(this._shutdownBrowser(browserId));
        }
        await Promise.all(shutdownPromises);
    }

    findAvailableBrowser() {
        // Early exit: check concurrency limit first (cheapest check)
        if (this.activeJobs >= this.globalMaxConcurrency) {
            return null;
        }

        // Smart backpressure: consider both system overload and queue depth
        const isOverloaded = resourceMonitor.isSystemOverloaded();
        const queueDepth = this.jobQueue ? this.jobQueue.size() : 0;
        const queuePressure = queueDepth > this.queueBackpressureThreshold;

        // Calculate effective concurrency limit only if needed
        if (isOverloaded || queuePressure) {
            let effectiveMaxConcurrency = this.globalMaxConcurrency;

            if (isOverloaded) {
                effectiveMaxConcurrency = Math.floor(effectiveMaxConcurrency * 0.5);
            }

            if (queuePressure) {
                effectiveMaxConcurrency = Math.floor(effectiveMaxConcurrency * this.backpressureReductionFactor);
            }

            if (this.activeJobs >= effectiveMaxConcurrency) {
                return null;
            }
        }

        let bestBrowser = null;
        let lowestLoad = Infinity;

        for (const browser of this.browsers.values()) {
            // Early exit: if we find a browser with zero load, use it immediately
            if (browser.canAcceptJob() && browser.activeContexts === 0) {
                return browser;
            }

            // Skip crashed browsers
            if (this.browserAdapter.hasBrowserCrashed(browser.id)) {
                continue;
            }

            if (browser.canAcceptJob()) {
                const loadFactor = browser.getLoadFactor();
                if (loadFactor < lowestLoad) {
                    lowestLoad = loadFactor;
                    bestBrowser = browser;
                }
            }
        }

        return bestBrowser;
    }

    async createContext(browserId, contextId, jobId) {
        const browser = this.browsers.get(browserId);
        if (!browser) {
            throw new Error(`Browser ${browserId} not found`);
        }

        // Если включена ротация user agents, создаем контекст с новым user agent
        if (this.rotateUserAgents) {
            const contextConfig = {
                userAgent: userAgentManager.getNext()
            };
            await this.browserAdapter.createContextWithConfig(browserId, contextId, contextConfig);
        } else {
            await this.browserAdapter.createContext(browserId, contextId);
        }

        browser.addContext(contextId, {id: contextId, jobId});
        this.activeJobs++;
    }

    async closeContext(browserId, contextId) {
        const browser = this.browsers.get(browserId);
        if (!browser) {
            throw new Error(`Browser ${browserId} not found`);
        }

        await this.browserAdapter.closeContext(browserId, contextId);
        browser.removeContext(contextId);
        this.activeJobs--;
    }

    async restartBrowser(browserId) {
        const browser = this.browsers.get(browserId);
        if (!browser) {
            throw new Error(`Browser ${browserId} not found`);
        }

        // Close all active contexts first
        const contextIds = Array.from(browser.contexts.keys());
        await Promise.all(
            contextIds.map(contextId => this.closeContext(browserId, contextId))
        );

        // Shutdown the browser
        await this._shutdownBrowser(browserId);

        // Restart the browser
        try {
            await this.browserAdapter.launchBrowser(browserId, browser.config);
            browser.markAsRunning();
        } catch (error) {
            console.error(`Failed to restart browser ${browserId}:`, error);
            browser.markAsCrashed();
        }
    }

    getBrowserStats() {
        const stats = {};
        for (const [browserId, browser] of this.browsers) {
            stats[browserId] = {
                status: browser.status,
                activeContexts: browser.activeContexts,
                maxContexts: browser.maxContexts,
                jobsProcessed: browser.jobsProcessed,
                loadFactor: browser.getLoadFactor()
            };
        }
        return {
            browsers: stats,
            totalActiveJobs: this.activeJobs,
            globalMaxConcurrency: this.globalMaxConcurrency
        };
    }

    async healthCheck() {
        const crashedBrowsers = [];

        for (const [browserId, browser] of this.browsers) {
            if (this.browserAdapter.hasBrowserCrashed(browserId)) {
                crashedBrowsers.push(browserId);
            }
        }

        // Restart crashed browsers
        for (const browserId of crashedBrowsers) {
            console.warn(`Detected crashed browser ${browserId}, restarting...`);
            try {
                await this.restartBrowser(browserId);
            } catch (error) {
                console.error(`Failed to restart crashed browser ${browserId}:`, error);
            }
        }

        return {
            totalBrowsers: this.browsers.size,
            crashedBrowsers: crashedBrowsers.length,
            restarted: crashedBrowsers.length
        };
    }

    async _shutdownBrowser(browserId) {
        try {
            await this.browserAdapter.closeBrowser(browserId);
            const browser = this.browsers.get(browserId);
            if (browser) {
                browser.markAsStopped();
            }
        } catch (error) {
            console.error(`Error shutting down browser ${browserId}:`, error);
        }
    }
}