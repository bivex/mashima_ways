/**
 * Long-running scraper for interminai debugging
 * Stays alive for ~60 seconds with continuous requests
 */

import { PlaywrightBrowserAdapter } from '../src/infrastructure/adapters/PlaywrightBrowserAdapter.js';
import { SingleBrowserManager } from '../src/domain/services/SingleBrowserManager.js';
import { BrowserConfig } from '../src/domain/value-objects/BrowserConfig.js';

const adapter = new PlaywrightBrowserAdapter();
const browserManager = new SingleBrowserManager(adapter, {
    contextsPerCore: 8
});

const config = BrowserConfig.forMaximumSpeed();

await browserManager.initialize(config);

console.log('🔥 Starting LONG-RUNNING scraper for interminai analysis');
console.log('   Will run continuously for ~60 seconds');
console.log('   Chrome will stay alive for profiling');
console.log('');

const targetSite = 'https://news.ycombinator.com';
let count = 0;
const startTime = Date.now();
const duration = 60000; // 60 seconds

while (Date.now() - startTime < duration) {
    try {
        const { contextId, context } = await browserManager.acquireContext(targetSite);
        const page = await context.newPage();

        await page.goto(targetSite, {
            waitUntil: 'domcontentloaded',
            timeout: 10000
        });

        const data = await page.evaluate(() => ({
            title: document.title,
            links: document.links.length
        }));

        await page.close();
        browserManager.releaseContext(contextId);

        count++;
        if (count % 10 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`Progress: ${count} requests in ${elapsed}s (${(count / (Date.now() - startTime) * 1000).toFixed(2)} URLs/sec)`);
        }

        // Small delay to prevent overwhelming
        await new Promise(r => setTimeout(r, 100));

    } catch (e) {
        // Ignore errors and continue
    }
}

const totalTime = Date.now() - startTime;
console.log(`\n✅ Completed ${count} requests in ${(totalTime/1000).toFixed(2)}s`);
console.log(`   Average: ${(totalTime/count).toFixed(0)}ms per request`);
console.log(`   Throughput: ${(count / (totalTime/1000)).toFixed(2)} URLs/sec\n`);

await browserManager.shutdown();
console.log('Done!');
