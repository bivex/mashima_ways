#!/usr/bin/env node
/**
 * Copyright (c) 2025 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2025-12-28T13:40:00
 * Last Updated: 2025-12-28T14:56:34
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Google Search Parser
 * Simple parser for Google search results
 *
 * ⚠️  WARNING: Google aggressively blocks headless browsers
 * For reliable results, use residential proxies or consider Yahoo parser instead
 * (Yahoo works well in headless mode and uses Bing's search technology)
 */

/**
 * Complete Google Parser with Pagination
 * Note: Requires proxy rotation for production use due to Google blocking
 */

import { chromium } from 'patchright';

async function searchGoogle(query, maxResults = 10, maxPages = 1) {
    const browser = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    });
    const allResults = [];
    const resultsPerPage = 10; // Google typically shows 10 results per page

    console.log(`🔍 Searching Google for: "${query}" (${maxPages} pages, ${maxResults} max results)`);

    try {
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const offset = (pageNum - 1) * resultsPerPage;
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${offset}`;

            console.log(`📄 Processing page ${pageNum}/${maxPages} (offset: ${offset})`);

            // Add random delay between requests (5-15 seconds) to mimic human behavior
            if (pageNum > 1) {
                const delay = 5000 + Math.random() * 10000; // 5-15 seconds
                console.log(`⏳ Waiting ${Math.round(delay/1000)}s before next page request...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            // Try different proxy servers to bypass Google blocking
            const proxies = [
                null, // Try without proxy first
                'http://proxy1.example.com:8080', // Add real proxy servers here
                'http://proxy2.example.com:8080',
                'http://proxy3.example.com:8080'
            ];

            let context;
            let proxyUsed = null;

            for (const proxy of proxies) {
                try {
                    console.log(`🌐 Trying ${proxy ? 'with proxy: ' + proxy : 'without proxy'}...`);

                    // Use mobile user agents which Google blocks less aggressively
                    const userAgents = [
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                        'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                        'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
                    ];
                    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

                    // Use mobile viewport for mobile user agents
                    const isMobile = randomUserAgent.includes('Mobile') || randomUserAgent.includes('iPhone') || randomUserAgent.includes('Android');
                    const viewport = isMobile ?
                        { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true } :
                        { width: 1920, height: 1080 };

                    const contextOptions = {
                        userAgent: randomUserAgent,
                        viewport: viewport,
                        locale: 'en-US',
                        timezoneId: 'America/New_York',
                        permissions: [],
                        extraHTTPHeaders: {
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'DNT': '1',
                            'Connection': 'keep-alive',
                            'Upgrade-Insecure-Requests': '1',
                        }
                    };

                    if (proxy) {
                        contextOptions.proxy = { server: proxy };
                    }

                    context = await browser.newContext(contextOptions);
                    proxyUsed = proxy;
                    break; // Successfully created context

                } catch (error) {
                    console.log(`❌ Failed to create context with proxy ${proxy}:`, error.message);
                    if (proxy === proxies[proxies.length - 1]) {
                        throw new Error('All proxy attempts failed');
                    }
                }
            }

            console.log(`✅ Using ${proxyUsed ? 'proxy: ' + proxyUsed : 'no proxy'}`);
            const page = await context.newPage();

            // Log console messages
            page.on('console', msg => {
                console.log('🔍 BROWSER CONSOLE:', msg.type(), ':', msg.text());
            });

            // Log page errors
            page.on('pageerror', error => {
                console.log('🚨 PAGE ERROR:', error.message);
            });

            // Log network requests
            page.on('request', request => {
                if (request.url().includes('sorry') || request.url().includes('blocked')) {
                    console.log('🚫 BLOCKING REQUEST:', request.url());
                }
            });

            // Stealth mode: Hide headless browser traces
            await page.addInitScript(() => {
                // Remove webdriver property
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });

                // Mock plugins
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [
                        {
                            0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format', __pluginName: 'Chrome PDF Plugin' },
                            description: 'Portable Document Format',
                            filename: 'internal-pdf-viewer',
                            length: 1,
                            name: 'Chrome PDF Plugin'
                        },
                        {
                            0: { type: 'application/pdf', suffixes: 'pdf', description: '', __pluginName: 'Chromium PDF Plugin' },
                            description: '',
                            filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
                            length: 1,
                            name: 'Chromium PDF Plugin'
                        }
                    ],
                });

                // Mock languages
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en'],
                });

                // Mock hardware concurrency
                Object.defineProperty(navigator, 'hardwareConcurrency', {
                    get: () => 8,
                });

                // Mock screen properties
                Object.defineProperty(screen, 'width', {
                    get: () => 1920,
                });
                Object.defineProperty(screen, 'height', {
                    get: () => 1080,
                });
                Object.defineProperty(screen, 'availWidth', {
                    get: () => 1920,
                });
                Object.defineProperty(screen, 'availHeight', {
                    get: () => 1040,
                });

                // Mock chrome runtime
                window.chrome = {
                    runtime: {},
                    csi: () => {},
                    loadTimes: () => ({}),
                    app: {}
                };

                // Mock permissions
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );
            });

            try {
                // Block resources for faster loading
                await page.route('**/*', route => {
                    const type = route.request().resourceType();
                    const url = route.request().url();

                    if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                        return route.abort();
                    }

                    if (url.includes('google-analytics') ||
                        url.includes('googletagmanager') ||
                        url.includes('doubleclick') ||
                        url.includes('googlesyndication') ||
                        url.includes('googleusercontent')) {
                        return route.abort();
                    }

                    return route.continue();
                });

                await page.goto(searchUrl, {
                    waitUntil: 'networkidle',
                    timeout: 60000
                });

                await page.waitForTimeout(3000);

                // Debug: Check page content
                const pageTitle = await page.title();
                const pageUrl = page.url();
                console.log(`📄 Page loaded: "${pageTitle}"`);
                console.log(`📄 URL: ${pageUrl}`);

                // Check if we're blocked or redirected
                if (pageUrl.includes('sorry') || pageUrl.includes('blocked') || pageTitle.includes('blocked') || pageTitle.includes('sorry')) {
                    console.log('🚫 Detected blocking page, trying alternative approach...');
                    // Try to continue anyway
                }

                // Accept cookies if present
                try {
                    const acceptButton = await page.$('button:has-text("Accept"), button:has-text("I agree"), [aria-label*="Accept"]');
                    if (acceptButton) {
                        await acceptButton.click();
                        await page.waitForTimeout(500);
                    }
                } catch (e) {
                    // Continue if no cookie banner
                }

                // Parsing results
                const pageResults = await page.evaluate(() => {
                    const searchResults = [];

                    // Find h3 elements within search result containers
                    const resultElements = document.querySelectorAll('div[data-ved] h3');

                    for (let i = 0; i < Math.min(resultElements.length, 10); i++) {
                        const titleElement = resultElements[i];

                        try {
                            let title = titleElement ? titleElement.textContent.trim() : '';
                            let url = '';

                            // Get URL from the parent link element
                            const linkElement = titleElement ? titleElement.closest('a') : null;
                            if (linkElement) {
                                url = linkElement.href;
                            }

                            // Clean up title
                            if (title.includes('...')) {
                                title = title.replace(/\s*\.\.\..*/, '');
                            }

                            // Try to find description - look in parent containers
                            let description = '';
                            const parentContainer = titleElement ? titleElement.closest('div[data-ved]') : null;
                            if (parentContainer) {
                                const descElement = parentContainer.querySelector('span, div span, .VwiC3b');
                                if (descElement) {
                                    description = descElement.textContent.trim();
                                }
                            }

                            // Filter out non-organic results
                            if (title && url && url.startsWith('http') && !url.includes('google.com')) {
                                searchResults.push({
                                    title: title,
                                    url: url,
                                    description: description,
                                    position: i + 1,
                                    page: 1,
                                    engine: 'google'
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

                // Longer delay between pages to mimic human behavior
                if (pageNum < maxPages) {
                    const pageDelay = 8000 + Math.random() * 12000; // 8-20 seconds
                    console.log(`⏳ Waiting ${Math.round(pageDelay/1000)}s before next page...`);
                    await new Promise(resolve => setTimeout(resolve, pageDelay));
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
        console.log('🧪 Testing Complete Google Parser with Pagination');
        console.log('='.repeat(70));

        // Test 1: Single page search
        console.log('\n📄 TEST 1: Single page search');
        console.log('-'.repeat(30));

        const singlePageResults = await searchGoogle('how to improve seo', 10, 1);

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

        const multiPageResults = await searchGoogle('how to improve seo', 25, 3);

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
