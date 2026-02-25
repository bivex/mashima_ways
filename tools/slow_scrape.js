/**
 * Very slow scraper for interminai debugging
 */

import { PlaywrightBrowserAdapter } from '../src/infrastructure/adapters/PlaywrightBrowserAdapter.js';
import { SingleBrowserManager } from '../src/domain/services/SingleBrowserManager.js';
import { BrowserConfig } from '../src/domain/value-objects/BrowserConfig.js';

const adapter = new PlaywrightBrowserAdapter();
const browserManager = new SingleBrowserManager(adapter, { contextsPerCore: 2 });
const config = BrowserConfig.forSingleBrowserArchitecture();

await browserManager.initialize(config);

console.log('🔥 Starting SLOW scraper for debugging...');
console.log('   Will process 100 URLs with delays');
console.log('   Chrome will stay alive for ~2 minutes');
console.log('');

const testUrls = Array(100).fill('https://httpbin.org/delay/1');

let count = 0;
for (const url of testUrls) {
    try {
        const { contextId, context } = await browserManager.acquireContext(url);
        const page = await context.newPage();

        await page.route('**/*', route => {
            const type = route.request().resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                return route.abort();
            }
            return route.continue();
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.close();
        browserManager.releaseContext(contextId);

        count++;
        if (count % 10 === 0) {
            console.log(`Progress: ${count}/100`);
        }

        // Extra delay to keep Chrome alive longer
        await new Promise(r => setTimeout(r, 500));
    } catch (e) {
        // Ignore errors
    }
}

await browserManager.shutdown();
console.log('✅ Done!');
