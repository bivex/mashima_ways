/**
 * Full load test - 80 parallel URLs for maximum throughput
 */

import { PlaywrightBrowserAdapter } from '../src/infrastructure/adapters/PlaywrightBrowserAdapter.js';
import { SingleBrowserManager } from '../src/domain/services/SingleBrowserManager.js';
import { BrowserConfig } from '../src/domain/value-objects/BrowserConfig.js';

const adapter = new PlaywrightBrowserAdapter();

// AGGRESSIVE: 80 contexts (10 cores × 8)
const browserManager = new SingleBrowserManager(adapter, {
    contextsPerCore: 8
});

// MAXIMUM SPEED config
const config = BrowserConfig.forMaximumSpeed();

await browserManager.initialize(config);

// Real site to test with (fast and reliable)
const targetSite = 'https://news.ycombinator.com';

// Create 80 parallel requests (simulating production load)
const testUrls = Array(80).fill(targetSite);

console.log('🔥 FULL LOAD TEST - 80 Parallel URLs');
console.log(`   Target: ${targetSite}`);
console.log(`   Contexts: 80`);
console.log(`   Expected: ~3-4 seconds total`);
console.log('');

const startTime = Date.now();
let completed = 0;
let failed = 0;
const times = [];

// Launch all workers in parallel
const workers = testUrls.map(async (url, index) => {
    const workerStart = Date.now();

    try {
        const { contextId, context } = await browserManager.acquireContext(url);
        const page = await context.newPage();

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 10000
        });

        const data = await page.evaluate(() => ({
            title: document.title,
            links: document.links.length
        }));

        await page.close();
        browserManager.releaseContext(contextId);

        const duration = Date.now() - workerStart;
        times.push(duration);
        completed++;

        return { success: true, duration, index };

    } catch (e) {
        failed++;
        const duration = Date.now() - workerStart;
        return { success: false, duration, error: e.message, index };
    }
});

// Wait for all to complete
console.log('⏳ Processing 80 URLs in parallel...\n');
const results = await Promise.all(workers);

const totalTime = Date.now() - startTime;

// Analysis
times.sort((a, b) => a - b);
const min = times[0];
const max = times[times.length - 1];
const median = times[Math.floor(times.length / 2)];
const avg = times.reduce((a, b) => a + b, 0) / times.length;

// Percentiles
const p95 = times[Math.floor(times.length * 0.95)];
const p99 = times[Math.floor(times.length * 0.99)];

console.log('═══════════════════════════════════════');
console.log('         FULL LOAD TEST RESULTS');
console.log('═══════════════════════════════════════');
console.log(`Total Time:      ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
console.log(`Completed:       ${completed}/80`);
console.log(`Failed:          ${failed}/80`);
console.log(`Success Rate:    ${((completed/80)*100).toFixed(1)}%`);
console.log('');
console.log('Timing Statistics (ms):');
console.log(`  Min:     ${min}ms`);
console.log(`  Median:  ${median}ms`);
console.log(`  Average: ${avg.toFixed(0)}ms`);
console.log(`  Max:     ${max}ms`);
console.log(`  P95:     ${p95}ms`);
console.log(`  P99:     ${p99}ms`);
console.log('');
console.log('Throughput:');
console.log(`  URLs/sec:     ${(80 / (totalTime/1000)).toFixed(2)}`);
console.log(`  URLs/min:     ${(80 / (totalTime/1000) * 60).toFixed(0)}`);
console.log(`  URLs/hour:    ${(80 / (totalTime/1000) * 3600).toFixed(0)}`);
console.log('');

// Compare with theoretical
const theoreticalTime = 3062; // GitHub was slowest
const theoreticalThroughput = 80 / (theoreticalTime / 1000);
const efficiency = (80 / (totalTime/1000)) / theoreticalThroughput * 100;

console.log('Comparison:');
console.log(`  Actual throughput:    ${(80 / (totalTime/1000)).toFixed(2)} URLs/sec`);
console.log(`  Theoretical (GitHub): ${theoreticalThroughput.toFixed(2)} URLs/sec`);
console.log(`  Efficiency:           ${efficiency.toFixed(1)}% of theoretical max`);
console.log('');

// Time distribution
const buckets = [0, 0, 0, 0]; // <1s, 1-2s, 2-3s, >3s
for (const t of times) {
    if (t < 1000) buckets[0]++;
    else if (t < 2000) buckets[1]++;
    else if (t < 3000) buckets[2]++;
    else buckets[3]++;
}

console.log('Time Distribution:');
console.log(`  < 1s:    ${buckets[0]} (${(buckets[0]/80*100).toFixed(1)}%)`);
console.log(`  1-2s:   ${buckets[1]} (${(buckets[1]/80*100).toFixed(1)}%)`);
console.log(`  2-3s:   ${buckets[2]} (${(buckets[2]/80*100).toFixed(1)}%)`);
console.log(`  > 3s:   ${buckets[3]} (${(buckets[3]/80*100).toFixed(1)}%)`);

await browserManager.shutdown();

console.log('');
console.log('✅ Full load test complete!');
