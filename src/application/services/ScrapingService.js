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

import {JobResult} from '../../domain/value-objects/JobResult.js';

export class ScrapingService {
    constructor(browserAdapter) {
        this.browserAdapter = browserAdapter;
    }

    async scrape(job, browserId, contextId, browserManager = null) {
        const startTime = Date.now();
        let page = null;

        try {
            // Support both architectures:
            // - Single Browser: browserManager.createPage(contextId)
            // - Browser Pool: browserAdapter.createPage(browserId, contextId)
            if (browserManager && typeof browserManager.createPage === 'function') {
                page = await browserManager.createPage(contextId);
            } else {
                page = await this.browserAdapter.createPage(browserId, contextId);
            }

            // Configure page based on job options
            if (job.options.blockResources && job.options.blockResources.length > 0) {
                await page.route('**/*', route => {
                    const resourceType = route.request().resourceType();
                    if (job.options.blockResources.includes(resourceType)) {
                        route.abort();
                    } else {
                        route.continue();
                    }
                });
            }

            // Navigate to the URL
            await page.goto(job.url.toString(), {
                timeout: job.options.timeout,
                waitUntil: job.options.waitUntil
            });

            // For testing: add artificial delay for URLs containing "delay"
            if (job.url.toString().includes('delay')) {
                console.log(`🔄 Applying 3s delay for URL: ${job.url.toString()}`);
                await page.waitForTimeout(3000); // 3 second delay for deterministic testing
            } else {
                console.log(`⚡ No delay for URL: ${job.url.toString()}`);
            }

            // Extract data - this is a placeholder, real implementation would depend on the scraping logic
            const title = await page.title();
            const html = await page.content();

            const duration = Date.now() - startTime;
            return JobResult.success({title, html}, duration);

        } catch (error) {
            const duration = Date.now() - startTime;
            throw new Error(`Scraping failed: ${error.message}`);
        } finally {
            // Cleanup: close page (context cleanup happens at JobScheduler level)
            if (page) {
                try {
                    await page.close();
                    console.debug(`✅ Page closed for job ${job.id}`);
                } catch (closeError) {
                    console.warn(`⚠️ Failed to close page for job ${job.id}:`, closeError.message);
                }
            }
        }
    }
}