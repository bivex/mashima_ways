/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-24 23:47
 * Last Updated: 2026-02-24 23:47
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

export const config = {
    // Architecture mode: 'pool' or 'single-browser'
    architecture: 'pool', // Change to 'single-browser' for § Single Browser Architecture

    // Browser pool configuration - focused on controlled throughput, not max browsers
    browser: {
        poolSize: 1, // Temporarily reduced for memory testing on 16GB Mac
        maxContextsPerBrowser: 25, // Max concurrent contexts per browser (25-50 recommended)
        globalMaxConcurrency: 100, // Global max concurrent jobs (poolSize × maxContextsPerBrowser)
        headless: true,
        args: [
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-gl-drawing-for-tests',
            // Uncomment for isolated environments:
            // '--no-sandbox',
            // '--disable-setuid-sandbox'
        ],
        blockResources: ['image', 'media', 'font'],
        javaScriptEnabled: true,
        timeout: 30000,
        // User agent configuration
        rotateUserAgents: true, // Rotate user agents for different sessions
        defaultUserAgent: null, // null = auto-select realistic user agent

        // Smart backpressure configuration
        queueBackpressureThreshold: 50, // Reduce concurrency when queue > 50
        backpressureReductionFactor: 0.7 // Reduce to 70% capacity under pressure
    },

    // § Single Browser Architecture configuration (playwright_context_architecture.md)
    // Used when architecture = 'single-browser'
    singleBrowser: {
        contextsPerCore: 4,        // § 3: N = CPU_CORES × 4 (optimal)
        maxContexts: null,         // null = auto-calculate (CPU_CORES × contextsPerCore)
        pagesPerContext: 50,       // § 3: K = 50 (rotate every 50 pages)
        contextLifetimeMs: 300000, // 5 minutes max lifetime
    },

    // Job configuration
    job: {
        defaultTimeout: 30000,
        defaultWaitUntil: 'domcontentloaded', // 'load', 'domcontentloaded', 'networkidle'
        defaultRetries: 2,
        maxRetries: 5
    },

    // System configuration
    system: {
        gracefulShutdownTimeout: 30000, // ms to wait for active jobs to finish
        healthCheckInterval: 60000 // ms between health checks
    }
};