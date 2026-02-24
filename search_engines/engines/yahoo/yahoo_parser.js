#!/usr/bin/env node
/**
 * Copyright (c) 2025 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2025-12-28T14:00:00
 * Last Updated: 2026-02-24 23:57
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Yahoo Search Parser
 * Note: Yahoo uses Bing's search technology since 2015
 * This parser handles Yahoo's interface and potential Bing redirects
 */

import { chromium } from 'patchright';

async function searchYahoo(query, maxResults = 10, maxPages = 1) {
    const browser = await chromium.launch({ headless: true });
    const allResults = [];
    const resultsPerPage = 10; // Yahoo typically shows 10 results per page

    console.log(`🔍 Searching Yahoo for: "${query}" (${maxPages} pages, ${maxResults} max results)`);
    console.log(`ℹ️  Note: Yahoo uses Bing's search technology`);

    try {
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const offset = (pageNum - 1) * resultsPerPage;
            const searchUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}&b=${offset + 1}`;

            console.log(`📄 Processing page ${pageNum}/${maxPages} (offset: ${offset})`);

            const context = await browser.newContext();
            const page = await context.newPage();

            try {
                // Block resources for faster loading
                await page.route('**/*', route => {
                    const type = route.request().resourceType();
                    const url = route.request().url();

                    if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                        return route.abort();
                    }

                    if (url.includes('yahoo.com/ads') ||
                        url.includes('analytics') ||
                        url.includes('doubleclick') ||
                        url.includes('googlesyndication') ||
                        url.includes('amazon-adsystem')) {
                        return route.abort();
                    }

                    return route.continue();
                });

                await page.goto(searchUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });

                await page.waitForTimeout(500);

                // Check if Yahoo redirected to Bing (since they use Bing's tech)
                const currentUrl = page.url();
                const isRedirectedToBing = currentUrl.includes('bing.com');

                if (isRedirectedToBing) {
                    console.log(`🔄 Yahoo redirected to Bing, using Bing parser logic`);
                }

                // Parsing results
                const pageResults = await page.evaluate(() => {
                    const searchResults = [];

                    // Try Yahoo-specific selectors first
                    const yahooSelectors = [
                        '.algo-sr', // Yahoo specific
                        '.dd', // Yahoo dropdown results
                        '.compTitle', // Yahoo title class
                        'h3.title a', // Yahoo link structure
                        '.result', // Generic result class
                        'li a' // List item links
                    ];

                    let resultBlocks = [];

                    // First try Yahoo-specific selectors
                    for (const selector of yahooSelectors) {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0) {
                            resultBlocks = Array.from(elements);
                            break;
                        }
                    }

                    // If no Yahoo-specific results, try Bing-like selectors (since Yahoo uses Bing)
                    if (resultBlocks.length === 0) {
                        const bingSelectors = [
                            'li.b_algo',
                            '.b_algo',
                            'li[data-idx]',
                            '#results li'
                        ];

                        for (const selector of bingSelectors) {
                            const elements = document.querySelectorAll(selector);
                            if (elements.length > 0) {
                                resultBlocks = Array.from(elements);
                                break;
                            }
                        }
                    }

                    for (let i = 0; i < Math.min(resultBlocks.length, 10); i++) {
                        const block = resultBlocks[i];

                        try {
                            let titleElement = block.querySelector('h3, .title, a');
                            if (!titleElement) {
                                // If block is a link itself
                                if (block.tagName === 'A') {
                                    titleElement = block;
                                }
                            }

                            let title = titleElement ? titleElement.textContent.trim() : '';
                            let url = '';

                            // Get URL from the link
                            const linkElement = titleElement && titleElement.tagName === 'A' ? titleElement : titleElement?.closest('a');
                            if (linkElement) {
                                url = linkElement.href;
                            }

                            // Clean up title
                            if (title.includes('...')) {
                                title = title.replace(/\s*\.\.\..*/, '');
                            }

                            // Get description
                            const descriptionElement = block.querySelector('p, .dd, .compText, .result');
                            let description = descriptionElement ? descriptionElement.textContent.trim() : '';

                            // Filter out non-organic results and Yahoo-owned content
                            if (title && url && url.startsWith('http') &&
                                !url.includes('yahoo.com') &&
                                !url.includes('bing.com/aclik')) {
                                searchResults.push({
                                    title: title,
                                    url: url,
                                    description: description,
                                    position: i + 1,
                                    page: 1,
                                    engine: 'yahoo'
                                });
                            }
                        } catch (error) {
                            console.warn(`Error parsing result ${i + 1}:`, error.message);
                        }
                    }

                    return searchResults;
                });

                if (pageResults && pageResults.length > 0) {
                    // Update positions with page offset
                    const updatedResults = pageResults.map(result => ({
                        ...result,
                        position: result.position + offset,
                        page: pageNum
                    }));

                    allResults.push(...updatedResults);

                    console.log(`✅ Page ${pageNum}: Found ${pageResults.length} results (total: ${allResults.length})`);

                    // Stop if we have enough results
                    if (allResults.length >= maxResults) {
                        break;
                    }
                } else {
                    console.log(`⚠️ Page ${pageNum}: No results found, stopping pagination`);
                    break;
                }

                // Delay between pages
                if (pageNum < maxPages) {
                    console.log('⏳ Waiting 2 seconds before next page...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } finally {
                await page.close();
                await context.close();
            }
        }

        // Limit results
        const finalResults = allResults.slice(0, maxResults);

        console.log(`🎉 Pagination complete: Found ${finalResults.length} results across ${Math.min(maxPages, Math.ceil(finalResults.length / resultsPerPage))} pages`);

        return finalResults;

    } finally {
        await browser.close();
        console.log('🛑 Browser closed');
    }
}

// Test function
async function testCompleteParser() {
    try {
        console.log('🧪 Testing Complete Yahoo Parser with Pagination');
        console.log('='.repeat(70));
        console.log('ℹ️  Note: Yahoo search results may be powered by Bing');

        // Test 1: Single page search
        console.log('\n📄 TEST 1: Single page search');
        console.log('-'.repeat(30));

        const singlePageResults = await searchYahoo('how to improve seo', 10, 1);

        console.log(`📊 Single page results: ${singlePageResults.length}\n`);

        singlePageResults.slice(0, 5).forEach((result, index) => {
            console.log(`${index + 1}. ${result.title}`);
            console.log(`   URL: ${result.url}`);
            console.log(`   Page: ${result.page}`);
            console.log('');
        });

        // Test 2: Multi-page search
        console.log('\n📄 TEST 2: Multi-page search (3 pages, 25 max results)');
        console.log('-'.repeat(50));

        const multiPageResults = await searchYahoo('how to improve seo', 25, 3);

        console.log(`📊 Multi-page results: ${multiPageResults.length}\n`);

        multiPageResults.forEach((result, index) => {
            if (index < 10) { // Show first 10 results
                console.log(`${result.position}. ${result.title}`);
                console.log(`   URL: ${result.url}`);
                console.log(`   Page: ${result.page}`);
                console.log('');
            }
        });

        if (multiPageResults.length > 10) {
            console.log(`... and ${multiPageResults.length - 10} more results\n`);
        }

        // Statistics by pages
        const pageStats = {};
        multiPageResults.forEach(result => {
            pageStats[result.page] = (pageStats[result.page] || 0) + 1;
        });

        console.log('📈 Results distribution by pages:');
        Object.keys(pageStats).sort().forEach(page => {
            console.log(`   Page ${page}: ${pageStats[page]} results`);
        });

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error(error.stack);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    testCompleteParser()
        .then(() => {
            console.log('✅ Test completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Test failed:', error);
            process.exit(1);
        });
}
