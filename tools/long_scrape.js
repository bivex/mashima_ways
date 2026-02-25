/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-25 14:10
 * Last Updated: 2026-02-25 14:10
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Long-running scraper for interminai profiling
 */

import { PlaywrightBrowserAdapter } from '../src/infrastructure/adapters/PlaywrightBrowserAdapter.js';
import { SingleBrowserManager } from '../src/domain/services/SingleBrowserManager.js';
import { BrowserConfig } from '../src/domain/value-objects/BrowserConfig.js';

const adapter = new PlaywrightBrowserAdapter();
const browserManager = new SingleBrowserManager(adapter, { contextsPerCore: 4 });
const config = BrowserConfig.forSingleBrowserArchitecture();

await browserManager.initialize(config);

console.log('🚀 Scraping 50 URLs to keep Chrome running for profiling...');
console.log('   You can now run: ./tools/profile_with_interminai.sh');
console.log('');

const testUrls = Array(50).fill('https://example.com');

let count = 0;
for (const url of testUrls) {
    try {
        const { contextId, context } = await browserManager.acquireContext(url);
        const page = await context.newPage();

        // Block resources
        await page.route('**/*', route => {
            const type = route.request().resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                return route.abort();
            }
            return route.continue();
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
        await page.close();
        browserManager.releaseContext(contextId);

        count++;
        if (count % 10 === 0) {
            console.log(`Progress: ${count}/50 URLs processed`);
        }

        // Small delay to allow profiling
        await new Promise(r => setTimeout(r, 200));
    } catch (e) {
        // Ignore errors
    }
}

await browserManager.shutdown();
console.log('✅ Done!');
