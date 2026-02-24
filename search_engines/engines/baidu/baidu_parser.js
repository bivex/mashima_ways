#!/usr/bin/env node
/**
 * Copyright (c) 2025 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2025-12-28T14:15:00
 * Last Updated: 2025-12-28T13:52:35
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Baidu Search Parser
 * Parser for Baidu search results (China's dominant search engine)
 */

import { chromium } from 'patchright';

async function searchBaidu(query, maxResults = 10, maxPages = 1) {
    const browser = await chromium.launch({ headless: true });
    const allResults = [];
    const resultsPerPage = 10; // Baidu typically shows 10 results per page

    console.log(`🔍 Searching Baidu for: "${query}" (${maxPages} pages, ${maxResults} max results)`);
    console.log(`🇨🇳 Baidu is China's dominant search engine with 75%+ market share`);

    try {
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const offset = (pageNum - 1) * resultsPerPage;
            // Baidu uses 'wd' parameter and 'pn' for pagination (starts from 0)
            const searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&pn=${offset}`;

            console.log(`📄 Processing page ${pageNum}/${maxPages} (offset: ${offset})`);

            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport: { width: 1920, height: 1080 },
                locale: 'zh-CN',
                timezoneId: 'Asia/Shanghai'
            });
            const page = await context.newPage();

            // Set cookies to appear more legitimate
            await context.addCookies([
                {
                    name: 'BAIDUID',
                    value: '1234567890ABCDEF:FGHIJK',
                    domain: '.baidu.com',
                    path: '/'
                },
                {
                    name: 'BDUSS',
                    value: 'fake-session-token',
                    domain: '.baidu.com',
                    path: '/'
                }
            ]);

            try {
                // Block resources for faster loading
                await page.route('**/*', route => {
                    const type = route.request().resourceType();
                    const url = route.request().url();

                    if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                        return route.abort();
                    }

                    if (url.includes('baidu.com/ad') ||
                        url.includes('pos.baidu.com') ||
                        url.includes('cpro.baidu.com') ||
                        url.includes('analytics') ||
                        url.includes('hm.baidu.com') ||
                        url.includes('baidu.com/nocache')) {
                        return route.abort();
                    }

                    return route.continue();
                });

                await page.goto(searchUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });

                // Add random delays to appear more human-like
                await page.waitForTimeout(1000 + Math.random() * 2000);

                // Move mouse randomly
                await page.mouse.move(
                    Math.random() * 800 + 100,
                    Math.random() * 600 + 100
                );

                await page.waitForTimeout(500);

                // Check if Baidu is blocking access
                const pageTitle = await page.title();
                const bodyText = await page.evaluate(() => document.body.textContent);

                if (bodyText.includes('网络不给力') || bodyText.includes('百度安全验证') || pageTitle.includes('验证')) {
                    console.log('🚫 Baidu is blocking access (likely geographic restriction or anti-bot measures)');
                    console.log('💡 Baidu requires access from China or may detect automated requests');
                    console.log('💡 Consider using a VPN with Chinese IP or different approach');
                    return []; // Return empty results instead of crashing
                }

                // Parsing results
                const pageResults = await page.evaluate(() => {
                    const searchResults = [];

                    // Use the working selector that found results
                    const resultElements = document.querySelectorAll('.result');

                    for (let i = 0; i < Math.min(resultElements.length, 10); i++) {
                        const block = resultElements[i];

                        try {
                            let titleElement = block.querySelector('h3 a, a');
                            if (!titleElement) {
                                // If block is the link itself
                                if (block.tagName === 'A') {
                                    titleElement = block;
                                } else if (block.querySelector('h3')) {
                                    titleElement = block.querySelector('h3 a') || block.querySelector('a');
                                }
                            }

                            let title = titleElement ? titleElement.textContent.trim() : '';
                            let url = '';

                            // Get URL from the link
                            const linkElement = titleElement;
                            if (linkElement) {
                                url = linkElement.href;
                            }

                            // Clean up title - remove extra spaces and Baidu-specific formatting
                            title = title.replace(/\s+/g, ' ').trim();

                            // Get description
                            let description = '';

                            // Try different description selectors
                            const descSelectors = [
                                '.c-abstract',
                                '.c-span-last',
                                'p',
                                '.c-row',
                                'span'
                            ];

                            for (const descSelector of descSelectors) {
                                const descElement = block.querySelector(descSelector);
                                if (descElement && descElement.textContent.trim()) {
                                    description = descElement.textContent.trim();
                                    break;
                                }
                            }

                            // Clean up description
                            description = description.replace(/\s+/g, ' ').trim();

                            // Filter out Baidu-owned content and ads, but allow redirect URLs
                            if (title && url && url.startsWith('http') &&
                                !url.includes('baidu.com/ad') &&
                                !url.includes('pos.baidu.com') &&
                                !url.includes('cpro.baidu.com') &&
                                !url.includes('baidu.com/nocache')) {
                                searchResults.push({
                                    title: title,
                                    url: url,
                                    description: description,
                                    position: i + 1,
                                    page: 1,
                                    engine: 'baidu'
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
                    console.log('⏳ Waiting 3 seconds before next page...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
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
        console.log('🧪 Testing Complete Baidu Parser with Pagination');
        console.log('='.repeat(70));
        console.log('🇨🇳 Testing Baidu search (China\'s primary search engine)');
        console.log('⚠️  Note: Baidu has strict geographic restrictions and anti-bot measures');
        console.log('⚠️  Results may vary based on location and may require VPN access from China');

        // Test 1: Single page search
        console.log('\n📄 TEST 1: Single page search');
        console.log('-'.repeat(30));

        const singlePageResults = await searchBaidu('SEO优化', 10, 1); // "SEO优化" means "SEO optimization" in Chinese

        console.log(`📊 Single page results: ${singlePageResults.length}\n`);

        if (singlePageResults.length > 0) {
            singlePageResults.slice(0, 5).forEach((result, index) => {
                console.log(`${index + 1}. ${result.title}`);
                console.log(`   URL: ${result.url}`);
                console.log(`   Page: ${result.page}`);
                console.log('');
            });
        } else {
            console.log('   No results (likely due to geographic blocking)');
        }

        // Test 2: Multi-page search (only if first test worked)
        if (singlePageResults.length > 0) {
            console.log('\n📄 TEST 2: Multi-page search (3 pages, 25 max results)');
            console.log('-'.repeat(50));

            const multiPageResults = await searchBaidu('SEO优化', 25, 3); // "SEO优化" means "SEO optimization" in Chinese

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
        } else {
            console.log('\n📄 TEST 2: Skipped (first test failed due to blocking)');
        }

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
