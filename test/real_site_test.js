/**
 * Real website test for aggressive optimizations
 */

import { PlaywrightBrowserAdapter } from '../src/infrastructure/adapters/PlaywrightBrowserAdapter.js';
import { SingleBrowserManager } from '../src/domain/services/SingleBrowserManager.js';
import { BrowserConfig } from '../src/domain/value-objects/BrowserConfig.js';

const adapter = new PlaywrightBrowserAdapter();

// Test with AGGRESSIVE settings
const browserManager = new SingleBrowserManager(adapter, {
    contextsPerCore: 8  // 80 contexts total
});

// Use MAXIMUM SPEED config
const config = BrowserConfig.forMaximumSpeed();

await browserManager.initialize(config);

// Real websites to test
const testUrls = [
    'https://news.ycombinator.com',
    'https://www.reddit.com',
    'https://www.wikipedia.org',
    'https://github.com',
    'https://www.stackoverflow.com',
];

console.log('🔥 Testing AGGRESSIVE optimizations on real websites');
console.log('   80 contexts, 10s timeout, max blocking');
console.log('');

const results = [];
const startTime = Date.now();

for (const url of testUrls) {
    const urlStart = Date.now();
    let success = false;
    let error = null;

    try {
        const { contextId, context } = await browserManager.acquireContext(url);
        const page = await context.newPage();

        // Aggressive blocking is now enabled by default
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 10000
        });

        const data = await page.evaluate(() => {
            return {
                title: document.title,
                url: window.location.href,
                textLength: document.body.innerText.length,
                links: document.links.length
            };
        });

        await page.close();
        browserManager.releaseContext(contextId);

        success = true;
        const duration = Date.now() - urlStart;

        results.push({
            url: url.replace('https://', '').split('/')[0],
            duration,
            success,
            title: data.title?.substring(0, 50) + '...',
            textLength: data.textLength,
            links: data.links
        });

        console.log(`✅ ${results[results.length - 1].url.padEnd(25)} ${duration.toString().padStart(6)}ms - ${data.links} links, ${data.textLength} chars`);

    } catch (e) {
        const duration = Date.now() - urlStart;
        error = e.message;
        results.push({
            url: url.replace('https://', '').split('/')[0],
            duration,
            success: false,
            error: error.substring(0, 100)
        });
        console.log(`❌ ${url.replace('https://', '').split('/')[0].padEnd(25)} ${duration.toString().padStart(6)}ms - ERROR: ${error.substring(0, 50)}`);
    }
}

const totalTime = Date.now() - startTime;

console.log('');
console.log('═══════════════════════════════════════');
console.log('         RESULTS')
console.log('═══════════════════════════════════════');
console.log(`Total time: ${totalTime}ms`);
console.log(`Success: ${results.filter(r => r.success).length}/${results.length}`);
console.log(`Avg time: ${(totalTime / results.length).toFixed(0)}ms`);
console.log(`Throughput: ${(results.length / (totalTime / 1000)).toFixed(2)} URLs/sec`);
console.log('');

// Analysis
const successful = results.filter(r => r.success);
if (successful.length > 0) {
    console.log('Successful sites:');
    successful.forEach(r => {
        const rate = (r.textLength / r.duration * 1000).toFixed(0);
        console.log(`  ${r.url.padEnd(25)} ${rate.padStart(8)} chars/sec`);
    });
}

await browserManager.shutdown();

console.log('');
console.log('✅ Test complete!');
