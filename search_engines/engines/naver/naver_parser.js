#!/usr/bin/env node
/**
 * Copyright (c) 2025 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2025-12-28T15:00:00
 * Last Updated: 2025-12-28T15:00:00
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Naver Search Parser
 * Parser for Naver search results (South Korea's dominant search engine)
 */

import { chromium } from 'patchright';

async function searchNaver(query, maxResults = 10, maxPages = 1) {
    const browser = await chromium.launch({ headless: true });
    const allResults = [];
    const resultsPerPage = 10; // Naver typically shows 10 results per page

    console.log(`🔍 Searching Naver for: "${query}" (${maxPages} pages, ${maxResults} max results)`);
    console.log(`🇰🇷 Naver is South Korea's dominant search engine with 70%+ market share`);

    try {
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const offset = (pageNum - 1) * resultsPerPage + 1; // Naver uses 1-based indexing
            // Naver uses 'query' parameter and 'start' for pagination
            const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}&start=${offset}`;

            console.log(`📄 Processing page ${pageNum}/${maxPages} (start: ${offset})`);

            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                viewport: { width: 360, height: 640, isMobile: true },
                locale: 'ko-KR',
                timezoneId: 'Asia/Seoul'
            });
            const page = await context.newPage();

            try {
                // Block resources for faster loading
                await page.route('**/*', route => {
                    const type = route.request().resourceType();
                    const url = route.request().url();

                    if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                        return route.abort();
                    }

                    if (url.includes('naver.com/ad') ||
                        url.includes('naver.com/shopping') ||
                        url.includes('shopping.naver.com') ||
                        url.includes('analytics') ||
                        url.includes('wcs.naver.com') ||
                        url.includes('naver.com/cafe')) {
                        return route.abort();
                    }

                    return route.continue();
                });

                await page.goto(searchUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });

                await page.waitForTimeout(2000);

                // Check if Naver is blocking access or showing unexpected content
                const pageTitle = await page.title();
                const bodyText = await page.evaluate(() => document.body.textContent);

                if (bodyText.includes('접속이 제한되었습니다') || bodyText.includes('access denied') ||
                    pageTitle.includes('ERROR') || bodyText.includes('차단')) {
                    console.log('🚫 Naver is blocking access (likely geographic restriction or anti-bot measures)');
                    console.log('💡 Naver requires access from South Korea or may detect automated requests');
                    console.log('💡 Consider using a VPN with Korean IP or different approach');
                    return []; // Return empty results instead of crashing
                }

                // Check if we're getting navigation/filter elements instead of search results
                const hasNavigationElements = await page.evaluate(() => {
                    const navKeywords = ['관련도순', '최신순', '전체', '시간', '일', '주', '개월', '년'];
                    const links = document.querySelectorAll('a');
                    let navCount = 0;
                    const foundNavItems = [];

                    for (const link of links) {
                        const text = link.textContent.trim();
                        if (navKeywords.some(keyword => text.includes(keyword))) {
                            navCount++;
                            foundNavItems.push(text);
                        }
                    }
                    // Consider it navigation if more than a few such elements are found
                    return { isNavigation: navCount > 3, foundItems: foundNavItems.slice(0, 5) }; 
                });

                if (hasNavigationElements.isNavigation) {
                    console.log('🚫 Naver is showing navigation/filter elements instead of search results');
                    console.log(`💡 Found navigation items: ${hasNavigationElements.foundItems.join(', ')}`);
                    console.log('💡 This strongly suggests geographic restrictions or HTML structure changes');
                    console.log('💡 Naver may require a VPN with Korean IP address or a different user agent');
                    return []; // Return empty results
                }

                // Parsing results
                const pageResults = await page.evaluate(() => {
                    const searchResults = [];

                    // Try to find organic search results using various selectors
                    const naverSelectors = [
                        '.lst_total', // General list of results
                        '.bx', // General box for results
                        '.total_area', // Area containing total results
                        '.web_site', // Web site results
                        '.api_txt_lines.total_tit', // Main organic results
                        '.total_tit', // Title links
                        '.link_tit', // Alternative title selector
                        'dt a', // Definition list titles
                        '.question_text a', // Q&A titles
                        'h3.s_title a', // Common title link
                        'a.total_tit' // Common title link for web pages
                    ];

                    let resultBlocks = [];

                    for (const selector of naverSelectors) {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0) {
                            resultBlocks = Array.from(elements);
                            // Prioritize more specific result blocks
                            if (selector.includes('total_tit') || selector.includes('web_site')) {
                                break;
                            }
                        }
                    }

                    // Parse results from found elements
                    for (let i = 0; i < Math.min(resultBlocks.length, 10); i++) {
                        const titleElement = resultBlocks[i];

                        try {
                            // Naver titles are usually directly in the anchor tags
                            let title = titleElement ? titleElement.textContent.trim() : '';
                            let url = '';

                            // Get URL from the link
                            if (titleElement && titleElement.tagName === 'A') {
                                url = titleElement.href;
                            } else {
                                // Try to find the link within the element
                                const linkElement = titleElement ? titleElement.closest('a') : null;
                                if (linkElement) {
                                    url = linkElement.href;
                                }
                            }

                            // Clean up title - remove extra spaces
                            title = title.replace(/\s+/g, ' ').trim();

                            // Get description - look for nearby text elements
                            let description = '';

                            // Try to find description in parent container
                            const parentContainer = titleElement ? titleElement.closest('dd, .dsc_txt, .api_txt_lines') : null;
                            if (parentContainer) {
                                const descElement = parentContainer.querySelector('.dsc_txt, p, span');
                                if (descElement) {
                                    description = descElement.textContent.trim();
                                }
                            }

                            // Alternative: look for description in sibling elements
                            if (!description && titleElement) {
                                const sibling = titleElement.parentElement ? titleElement.parentElement.nextElementSibling : null;
                                if (sibling && sibling.textContent) {
                                    description = sibling.textContent.trim();
                                }
                            }

                            // Clean up description
                            description = description.replace(/\s+/g, ' ').trim();

                            // Filter out Naver-owned content and ads
                            if (title && url && url.startsWith('http') &&
                                !url.includes('naver.com/ad') &&
                                !url.includes('shopping.naver.com') &&
                                !url.includes('naver.com/cafe') &&
                                !url.includes('naver.com/blog') &&
                                !url.includes('naver.com/search.naver?')) {
                                searchResults.push({
                                    title: title,
                                    url: url,
                                    description: description,
                                    position: i + 1,
                                    page: 1,
                                    engine: 'naver'
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
                        position: result.position + ((pageNum - 1) * resultsPerPage),
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
        console.log('🧪 Testing Complete Naver Parser with Pagination');
        console.log('='.repeat(70));
        console.log('🇰🇷 Testing Naver search (South Korea\'s primary search engine)');
        console.log('⚠️  Note: Naver may have geographic restrictions');

        // Test 1: Single page search
        console.log('\n📄 TEST 1: Single page search');
        console.log('-'.repeat(30));

        const singlePageResults = await searchNaver('SEO', 10, 1);

        console.log(`📊 Single page results: ${singlePageResults.length}\n`);

        if (singlePageResults.length > 0) {
            singlePageResults.slice(0, 5).forEach((result, index) => {
                console.log(`${index + 1}. ${result.title}`);
                console.log(`   URL: ${result.url}`);
                console.log(`   Page: ${result.page}`);
                console.log('');
            });
        } else {
            console.log('   No results (may be due to geographic blocking)');
        }

        // Test 2: Multi-page search (only if first test worked)
        if (singlePageResults.length > 0) {
            console.log('\n📄 TEST 2: Multi-page search (3 pages, 25 max results)');
            console.log('-'.repeat(50));

            const multiPageResults = await searchNaver('SEO', 25, 3);

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
            console.log('\n📄 TEST 2: Skipped (first test failed)');
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
