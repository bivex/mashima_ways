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

export const ciConfig = {
    // CI-specific configuration - optimized for fast, reproducible tests
    browser: {
        poolSize: 1, // Single browser for deterministic resource usage
        maxContextsPerBrowser: 5, // Limited contexts for CI stability
        globalMaxConcurrency: 2, // Conservative concurrency for CI reliability
        headless: true,
        args: [
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-gl-drawing-for-tests',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        blockResources: ['image', 'media', 'font'],
        javaScriptEnabled: true,
        timeout: 15000, // Shorter timeouts for faster CI
        rotateUserAgents: false, // Disable for consistency
        defaultUserAgent: 'Mozilla/5.0 (compatible; CI-Test-Bot/1.0)',

        // Conservative backpressure for CI stability
        queueBackpressureThreshold: 10,
        backpressureReductionFactor: 0.8
    },

    // Job configuration for CI
    job: {
        defaultTimeout: 15000, // Shorter for CI speed
        defaultWaitUntil: 'domcontentloaded',
        defaultRetries: 2,
        maxRetries: 3 // Fewer retries for faster CI
    },

    // System configuration for CI
    system: {
        gracefulShutdownTimeout: 10000, // Faster shutdown for CI
        healthCheckInterval: 30000 // Less frequent checks
    }
};