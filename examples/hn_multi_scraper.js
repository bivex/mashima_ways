/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-25 14:32
 * Last Updated: 2026-02-25 14:32
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * HackerNews Multi-Page Scraper
 * Tests aggressive config on real pagination
 */

import { PlaywrightBrowserAdapter } from '../src/infrastructure/adapters/PlaywrightBrowserAdapter.js';
import { SingleBrowserManager } from '../src/domain/services/SingleBrowserManager.js';
import { BrowserConfig } from '../src/domain/value-objects/BrowserConfig.js';

const adapter = new PlaywrightBrowserAdapter();

// AGGRESSIVE: 80 contexts
const browserManager = new SingleBrowserManager(adapter, {
    contextsPerCore: 8
});

// MAXIMUM SPEED config
const config = BrowserConfig.forMaximumSpeed();

await browserManager.initialize(config);

console.log('🔥 HackerNews Multi-Page Scraper');
console.log('   Testing aggressive config on real pagination');
console.log('   Contexts: 80');
console.log('');

const baseUrl = 'https://news.ycombinator.com';
const pages = 10; // Scrape 10 pages
const results = [];

const startTime = Date.now();

// Scrape multiple pages in parallel
console.log(`⏳ Scraping ${pages} HackerNews pages in parallel...\n`);

const workers = [];
for (let page = 1; page <= pages; page++) {
    workers.push(scrapePage(page));
}

const allResults = await Promise.all(workers);

const totalTime = Date.now() - startTime;

// Process results
let totalStories = 0;
let totalLinks = 0;
const pageResults = [];

for (let i = 0; i < allResults.length; i++) {
    const result = allResults[i];
    if (result.success) {
        totalStories += result.stories;
        totalLinks += result.links;
        pageResults.push(result);
    }
}

console.log('');
console.log('═══════════════════════════════════════');
console.log('         RESULTS');
console.log('═══════════════════════════════════════');
console.log(`Total Time:      ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
console.log(`Pages Scraped:   ${pageResults.length}/${pages}`);
console.log(`Total Stories:    ${totalStories}`);
console.log(`Total Links:      ${totalLinks}`);
console.log(`Avg per page:     ${(totalStories / pageResults.length).toFixed(0)} stories`);
console.log(`Throughput:       ${(pageResults.length / (totalTime / 1000)).toFixed(2)} pages/sec`);
console.log('');

// Performance breakdown
console.log('Per-Page Breakdown:');
pageResults.forEach(r => {
    const rate = (r.stories / r.duration * 1000).toFixed(0);
    console.log(`  Page ${r.pageNum.toString().padStart(2)}: ${r.duration.toString().padStart(5)}ms - ${r.stories.toString().padStart(2)} stories (${rate} stories/sec)`);
});

console.log('');

// Sample stories from first page
if (pageResults.length > 0 && pageResults[0].storiesList.length > 0) {
    console.log('Sample Stories from Page 1:');
    pageResults[0].storiesList.slice(0, 5).forEach((story, i) => {
        console.log(`  ${i + 1}. ${story.title.substring(0, 60)}...`);
        console.log(`     Points: ${story.points} | Comments: ${story.comments}`);
    });
}

await browserManager.shutdown();

console.log('');
console.log('✅ Multi-page scraping complete!');
console.log(`   Successfully scraped ${pageResults.length} pages from HackerNews`);

/**
 * Scrape a single HackerNews page
 */
async function scrapePage(pageNum) {
    const pageStart = Date.now();
    const url = pageNum === 1 ? baseUrl : `${baseUrl}/?p=${pageNum}`;

    try {
        const { contextId, context } = await browserManager.acquireContext(url);
        const page = await context.newPage();

        // Wait for JavaScript to load the stories
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 10000
        });

        // Wait for stories to be rendered (HackerNews uses JS)
        await page.waitForSelector('.athing', { timeout: 5000 }).catch(() => {});

        const data = await page.evaluate(() => {
            const stories = [];
            const rows = document.querySelectorAll('.athing');

            // Debug: log how many rows found
            console.log(`Found ${rows.length} story rows`);

            rows.forEach(row => {
                const titleEl = row.querySelector('.titleline > a');
                const subtextEl = row.querySelector('.subtext');
                const pointsEl = row.querySelector('.score');
                const userEl = row.querySelector('.hnuser');

                if (titleEl) {
                    const title = titleEl.textContent;
                    const link = titleEl.href;

                    let points = 0;
                    let comments = 0;
                    let user = null;

                    if (pointsEl) {
                        points = parseInt(pointsEl.textContent) || 0;
                    }

                    if (subtextEl) {
                        const commentMatch = subtextEl.textContent.match(/(\d+)\s+comments/);
                        if (commentMatch) {
                            comments = parseInt(commentMatch[1]) || 0;
                        }
                    }

                    if (userEl) {
                        user = userEl.textContent;
                    }

                    stories.push({ title, link, points, comments, user });
                }
            });

            return {
                title: document.title,
                stories: stories.length,
                links: document.links.length
            };
        });

        await page.close();
        browserManager.releaseContext(contextId);

        const duration = Date.now() - pageStart;

        return {
            pageNum,
            url,
            duration,
            success: true,
            stories: data.stories,
            links: data.links,
            storiesList: data.stories
        };

    } catch (error) {
        const duration = Date.now() - pageStart;
        return {
            pageNum,
            url,
            duration,
            success: false,
            error: error.message
        };
    }
}
