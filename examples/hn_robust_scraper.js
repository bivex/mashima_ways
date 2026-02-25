/**
 * HackerNews Multi-Page Scraper - Robust Version
 * Handles rate limiting and pagination properly
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

console.log('🔥 HackerNews Multi-Page Scraper (Robust)');
console.log('   Testing aggressive config with rate limit handling');
console.log('   Contexts: 80');
console.log('');

const baseUrl = 'https://news.ycombinator.com';
const pages = 5; // Start with 5 pages to avoid rate limiting
const results = [];

const startTime = Date.now();

// Scrape pages sequentially to avoid rate limiting
console.log(`⏳ Scraping ${pages} HackerNews pages sequentially...\n`);

for (let pageNum = 1; pageNum <= pages; pageNum++) {
    const url = pageNum === 1 ? baseUrl : `${baseUrl}/?p=${pageNum}`;

    console.log(`  Scraping page ${pageNum}...`);
    const result = await scrapePage(pageNum, url);
    results.push(result);

    if (result.success) {
        console.log(`    ✅ ${result.stories} stories, ${result.links} links (${result.duration}ms)`);
    } else {
        console.log(`    ❌ Failed: ${result.error}`);
    }

    // Small delay between pages to avoid rate limiting
    if (pageNum < pages) {
        await new Promise(r => setTimeout(r, 500));
    }
}

const totalTime = Date.now() - startTime;

// Process results
let totalStories = 0;
let totalLinks = 0;
const pageResults = [];

for (const result of results) {
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
console.log(`Avg time/page:    ${(totalTime / pages).toFixed(0)}ms`);
console.log('');

// Sample stories
if (pageResults.length > 0 && pageResults[0].storiesList.length > 0) {
    console.log('Sample Stories from Page 1:');
    pageResults[0].storiesList.slice(0, 5).forEach((story, i) => {
        console.log(`  ${i + 1}. ${story.title.substring(0, 70)}`);
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
async function scrapePage(pageNum, url) {
    const pageStart = Date.now();

    try {
        const { contextId, context } = await browserManager.acquireContext(url);
        const page = await context.newPage();

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 15000  // 15s timeout for slower pages
        });

        // Wait for stories to load (HN uses JS)
        try {
            await page.waitForSelector('.athing', { timeout: 5000 });
        } catch {
            // Continue anyway, stories might be loaded
        }

        const data = await page.evaluate(() => {
            const stories = [];
            const rows = document.querySelectorAll('.athing');

            rows.forEach(row => {
                const titleEl = row.querySelector('.titleline > a');
                const subtextEl = row.querySelector('.subtext');
                const pointsEl = row.querySelector('.score');

                if (titleEl) {
                    const title = titleEl.textContent;
                    const link = titleEl.href;

                    let points = 0;
                    let comments = 0;

                    if (pointsEl) {
                        points = parseInt(pointsEl.textContent) || 0;
                    }

                    if (subtextEl) {
                        const commentMatch = subtextEl.textContent.match(/(\d+)\s+comments/);
                        if (commentMatch) {
                            comments = parseInt(commentMatch[1]) || 0;
                        }
                    }

                    stories.push({ title, link, points, comments });
                }
            });

            return {
                title: document.title,
                stories: stories.length,
                links: document.links.length,
                storiesList: stories
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
            error: error.message.substring(0, 100)
        };
    }
}
