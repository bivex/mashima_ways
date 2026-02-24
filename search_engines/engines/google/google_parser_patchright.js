#!/usr/bin/env node
/**
 * Copyright (c) 2025 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2025-12-28T15:20:00
 * Last Updated: 2025-12-28T15:19:52
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Google Search Parser using Patchright
 * 
 * Patchright is a patched version of Playwright that:
 * - Removes CDP detection leaks
 * - Patches automation flags at source code level
 * - More effective than runtime JavaScript injections
 */

import { chromium } from 'patchright';

async function searchGooglePatchright(query, maxResults = 10, maxPages = 1, options = {}) {
    const {
        headless = false,
        proxy = null,
    } = options;

    const allResults = [];
    const resultsPerPage = 10;

    console.log(`🔍 Patchright Google Search: "${query}"`);
    console.log(`🎭 Mode: ${headless ? 'headless' : 'headed'}`);

    const launchOptions = {
        headless: headless,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--disable-extensions',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ],
    };

    if (proxy) {
        launchOptions.proxy = proxy;
        console.log(`🌐 Using proxy: ${proxy.server}`);
    }

    const browser = await chromium.launch(launchOptions);

    try {
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const offset = (pageNum - 1) * resultsPerPage;
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${offset}&num=10&hl=en`;

            console.log(`\n📄 Page ${pageNum}/${maxPages} (offset: ${offset})`);

            if (pageNum > 1) {
                const delay = 2000 + Math.random() * 4000;
                console.log(`⏳ Waiting ${Math.round(delay/1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const userAgents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ];
            const selectedUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

            const context = await browser.newContext({
                userAgent: selectedUserAgent,
                viewport: { width: 1920, height: 1080 },
                locale: 'en-US',
                timezoneId: 'America/New_York',
            });

            const page = await context.newPage();

            // Collect console and errors
            const logs = { console: [], errors: [] };
            
            page.on('console', msg => {
                logs.console.push({ type: msg.type(), text: msg.text() });
                if (msg.type() === 'error') {
                    console.log('📝 CONSOLE ERROR:', msg.text().substring(0, 100));
                }
            });

            page.on('pageerror', error => {
                logs.errors.push(error.message);
            });

            try {
                await page.waitForTimeout(500 + Math.random() * 1000);

                console.log(`🌐 Navigating...`);
                await page.goto(searchUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                });

                // Human-like behavior
                await page.mouse.move(100 + Math.random() * 400, 100 + Math.random() * 400);
                await page.waitForTimeout(500 + Math.random() * 1000);

                // Check for blocking
                const pageUrl = page.url();
                const isBlocked = pageUrl.includes('sorry') || pageUrl.includes('blocked');

                // Check navigator properties
                const navigatorCheck = await page.evaluate(() => {
                    return {
                        webdriver: navigator.webdriver,
                        webdriverIn: 'webdriver' in navigator,
                        plugins: navigator.plugins.length,
                        hardwareConcurrency: navigator.hardwareConcurrency,
                    };
                });

                console.log('🔬 Navigator check:');
                console.log('   webdriver:', navigatorCheck.webdriver, navigatorCheck.webdriver === undefined ? '✅' : '❌');
                console.log('   "webdriver" in navigator:', navigatorCheck.webdriverIn, !navigatorCheck.webdriverIn ? '✅' : '⚠️');
                console.log('   plugins:', navigatorCheck.plugins);
                console.log('   hardwareConcurrency:', navigatorCheck.hardwareConcurrency);

                if (isBlocked) {
                    console.log('🚫 BLOCKED by Google');
                    console.log(`   URL: ${pageUrl.substring(0, 100)}...`);
                } else {
                    console.log('✅ Page loaded - checking for results...');

                    // Wait for results
                    await page.waitForTimeout(2000);

                    // Extract results
                    const pageResults = await page.evaluate(() => {
                        const results = [];
                        const elements = document.querySelectorAll('div.g, div[data-sokoban-container]');
                        
                        elements.forEach((el, i) => {
                            try {
                                const title = el.querySelector('h3')?.textContent?.trim();
                                const link = el.querySelector('a')?.href;
                                const snippet = el.querySelector('.VwiC3b, span')?.textContent?.trim();
                                
                                if (title && link && link.startsWith('http') && !link.includes('google.com')) {
                                    results.push({
                                        title,
                                        url: link,
                                        snippet: snippet || '',
                                        position: i + 1,
                                        engine: 'google'
                                    });
                                }
                            } catch (e) {}
                        });
                        
                        return results;
                    });

                    if (pageResults.length > 0) {
                        const updated = pageResults.map(r => ({
                            ...r,
                            position: r.position + offset,
                            page: pageNum
                        }));
                        allResults.push(...updated);
                        console.log(`✅ Found ${pageResults.length} results (total: ${allResults.length})`);

                        if (allResults.length >= maxResults) {
                            await page.close();
                            await context.close();
                            break;
                        }
                    } else {
                        console.log('⚠️ No results found on page');
                    }
                }

            } catch (error) {
                console.error('❌ Error:', error.message);
            } finally {
                await page.close();
                await context.close();
            }
        }

        const finalResults = allResults.slice(0, maxResults);
        console.log(`\n🎉 Complete: ${finalResults.length} results`);
        return finalResults;

    } finally {
        await browser.close();
        console.log('🛑 Browser closed\n');
    }
}

// Test function
async function testPatchright() {
    console.log('🧪 Testing Patchright Google Parser');
    console.log('='.repeat(60));
    console.log('');

    try {
        const results = await searchGooglePatchright('test query', 10, 1, {
            headless: false,
            // proxy: { server: 'http://proxy.com:8080', username: 'user', password: 'pass' }
        });

        if (results.length > 0) {
            console.log('\n📊 Results:');
            results.forEach((r, i) => {
                console.log(`${i + 1}. ${r.title}`);
                console.log(`   ${r.url}`);
            });
        } else {
            console.log('\n❌ No results - Google blocked the request');
            console.log('💡 Even Patchright cannot bypass IP-based blocking');
            console.log('💡 Residential proxies are required for Google scraping');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    testPatchright().then(() => process.exit(0)).catch(e => {
        console.error(e);
        process.exit(1);
    });
}

export { searchGooglePatchright };

