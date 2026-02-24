#!/usr/bin/env node
/**
 * Copyright (c) 2025 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2025-12-28T15:40:00
 * Last Updated: 2025-12-28T15:35:00
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Bing Search Parser with Stealth Mode (Patchright)
 * 
 * Features:
 * - Patchright for undetectable automation
 * - Human-like behavior simulation
 * - Proxy support with rotation
 * - Headed/headless modes
 * - Resource blocking for speed
 */

import { chromium } from 'patchright';
import fs from 'fs';
import path from 'path';

/**
 * Search Bing with stealth mode
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum results to return
 * @param {number} maxPages - Maximum pages to scrape
 * @param {object} options - Additional options
 * @returns {Promise<Array>} Search results
 */
async function searchBingStealth(query, maxResults = 10, maxPages = 1, options = {}) {
    const {
        headless = false,  // Headed by default for better stealth
        proxy = null,      // { server, username, password }
        blockResources = true,  // Block images/css for speed
        humanDelay = true,  // Add human-like delays
        saveToFile = true,  // Save URLs to file
        outputFile = 'urls.txt',  // Output filename
    } = options;

    const allResults = [];
    const resultsPerPage = 10;

    console.log(`🔍 Bing Stealth Search: "${query}"`);
    console.log(`🎭 Mode: ${headless ? 'headless' : 'headed'}`);

    // Launch options with stealth args
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
            const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${resultsPerPage}&first=${offset + 1}`;

            console.log(`\n📄 Page ${pageNum}/${maxPages} (offset: ${offset})`);

            // Human-like delay between pages
            if (pageNum > 1 && humanDelay) {
                const delay = 2000 + Math.random() * 3000;
                console.log(`⏳ Waiting ${Math.round(delay/1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            // Random user agents
            const userAgents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            ];
            const selectedUA = userAgents[Math.floor(Math.random() * userAgents.length)];

            // Create context with realistic fingerprint
            const context = await browser.newContext({
                userAgent: selectedUA,
                viewport: { width: 1920, height: 1080 },
                locale: 'en-US',
                timezoneId: 'America/New_York',
            });

            const page = await context.newPage();

            try {
                // Block resources for speed
                if (blockResources) {
                    await page.route('**/*', route => {
                        const type = route.request().resourceType();
                        const url = route.request().url();

                        if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                            return route.abort();
                        }

                        if (url.includes('bat.bing.com') ||
                            url.includes('analytics') ||
                            url.includes('tracking') ||
                            url.includes('telemetry')) {
                            return route.abort();
                        }

                        return route.continue();
                    });
                }

                // Human-like pre-navigation delay
                if (humanDelay) {
                    await page.waitForTimeout(300 + Math.random() * 500);
                }

                console.log(`🌐 Navigating...`);
                await page.goto(searchUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });

                // Human-like post-load behavior
                if (humanDelay) {
                    await page.mouse.move(
                        100 + Math.random() * 400,
                        100 + Math.random() * 200
                    );
                    await page.waitForTimeout(500 + Math.random() * 1000);
                }

                // Check for blocking
                const pageUrl = page.url();
                const isBlocked = pageUrl.includes('captcha') || pageUrl.includes('blocked');

                if (isBlocked) {
                    console.log('🚫 BLOCKED - stopping');
                    break;
                }

                // Wait for results
                await page.waitForTimeout(1500);

                // Parse results
                const pageResults = await page.evaluate(() => {
                    const searchResults = [];

                    // Get all result blocks
                    const resultBlocks = Array.from(document.querySelectorAll('li.b_algo, .b_algo'));

                    for (let i = 0; i < Math.min(resultBlocks.length, 10); i++) {
                        const block = resultBlocks[i];

                        try {
                            // Get title - prefer h2 > a structure
                            const h2Element = block.querySelector('h2');
                            const linkElement = h2Element?.querySelector('a') || block.querySelector('h2 a, a h2');
                            
                            let title = '';
                            let url = '';
                            
                            if (linkElement) {
                                // Get the actual text content of the link
                                title = linkElement.innerText?.trim() || linkElement.textContent?.trim() || '';
                                url = linkElement.href || '';
                            }

                            // Fallback title extraction
                            if (!title && h2Element) {
                                title = h2Element.innerText?.trim() || h2Element.textContent?.trim() || '';
                            }

                            // Decode Bing redirect URL
                            if (url && url.includes('bing.com/ck/a')) {
                                try {
                                    const urlObj = new URL(url);
                                    const uParam = urlObj.searchParams.get('u');
                                    if (uParam) {
                                        let cleanParam = uParam;
                                        if (uParam.startsWith('a1')) {
                                            cleanParam = uParam.substring(2);
                                        }
                                        url = atob(cleanParam);
                                    }
                                } catch (e) {}
                            }

                            // Get description
                            const descriptionElement = block.querySelector('.b_caption p, p.b_lineclamp2, .b_snippet, p');
                            const description = descriptionElement?.innerText?.trim() || '';

                            // Validate and add result
                            if (title && title.length > 2 && url && url.startsWith('http') && !url.includes('bing.com')) {
                                searchResults.push({
                                    title,
                                    url,
                                    description,
                                    position: i + 1,
                                    page: 1,
                                    engine: 'bing'
                                });
                            }
                        } catch (error) {}
                    }

                    return searchResults;
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
                        break;
                    }
                } else {
                    console.log(`⚠️ No results on page ${pageNum}`);
                    break;
                }

            } finally {
                await page.close();
                await context.close();
            }
        }

        const finalResults = allResults.slice(0, maxResults);
        console.log(`\n🎉 Complete: ${finalResults.length} results`);

        // Save URLs to file
        if (saveToFile && finalResults.length > 0) {
            const urls = finalResults.map(r => r.url);
            const outputPath = path.resolve(outputFile);
            
            // Append to file (create if doesn't exist)
            const content = urls.join('\n') + '\n';
            fs.appendFileSync(outputPath, content, 'utf8');
            
            console.log(`💾 Saved ${urls.length} URLs to ${outputPath}`);
        }

        return finalResults;

    } finally {
        await browser.close();
        console.log('🛑 Browser closed\n');
    }
}

/**
 * Save URLs to file (standalone function)
 * @param {Array} results - Search results
 * @param {string} filename - Output filename
 * @param {boolean} append - Append or overwrite
 */
function saveUrlsToFile(results, filename = 'urls.txt', append = true) {
    const urls = results.map(r => r.url);
    const outputPath = path.resolve(filename);
    
    if (append) {
        fs.appendFileSync(outputPath, urls.join('\n') + '\n', 'utf8');
    } else {
        fs.writeFileSync(outputPath, urls.join('\n') + '\n', 'utf8');
    }
    
    console.log(`💾 Saved ${urls.length} URLs to ${outputPath}`);
    return outputPath;
}

// Test function
async function testBingStealth() {
    console.log('🧪 Testing Bing Stealth Parser with URL saving');
    console.log('='.repeat(60));

    // Clear previous urls.txt
    const urlsFile = path.resolve('urls.txt');
    if (fs.existsSync(urlsFile)) {
        fs.unlinkSync(urlsFile);
        console.log('🗑️ Cleared previous urls.txt');
    }

    try {
        // Test: Search and save URLs
        console.log('\n📋 Searching and saving URLs...');
        const results = await searchBingStealth('javascript tutorial', 10, 1, {
            headless: false,
            humanDelay: true,
            saveToFile: true,
            outputFile: 'urls.txt',
        });

        console.log('\n📊 Results:');
        results.slice(0, 5).forEach((r, i) => {
            console.log(`${i + 1}. ${r.title}`);
            console.log(`   ${r.url}`);
        });

        // Show file content
        if (fs.existsSync(urlsFile)) {
            console.log('\n📄 Content of urls.txt:');
            console.log('-'.repeat(40));
            const content = fs.readFileSync(urlsFile, 'utf8');
            console.log(content);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    testBingStealth().then(() => process.exit(0)).catch(e => {
        console.error(e);
        process.exit(1);
    });
}

export { searchBingStealth, saveUrlsToFile };

