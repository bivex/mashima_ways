#!/usr/bin/env node
/**
 * Copyright (c) 2025 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2025-12-28T15:10:00
 * Last Updated: 2025-12-28T15:07:59
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Google Search Parser with ULTRA STEALTH
 * Addresses all detection issues found in console logs:
 * - Removes webdriver property completely (not just set to undefined)
 * - Fixes hardwareConcurrency injection
 * - Uses CDP to disable automation features at protocol level
 * - Adds more aggressive evasions
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Apply stealth plugin with all evasions
chromium.use(StealthPlugin());

async function searchGoogleUltraStealth(query, maxResults = 10, maxPages = 1, options = {}) {
    const {
        headless = false,
        useRealChrome = true,
        proxy = null,
        userAgent = null,
    } = options;

    const allResults = [];
    const resultsPerPage = 10;

    console.log(`🔍 ULTRA STEALTH Google Search: "${query}"`);
    console.log(`🎭 Mode: ${headless ? 'headless' : 'headed'} | Chrome: ${useRealChrome ? 'real' : 'chromium'}`);

    const launchOptions = {
        headless: headless,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-gpu',
            '--disable-infobars',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',  // For testing
            '--disable-features=IsolateOrigins,site-per-process',
            '--allow-running-insecure-content',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-sync',
            '--disable-translate',
            '--metrics-recording-only',
            '--safebrowsing-disable-auto-update',
            '--enable-webgl',
            '--use-gl=swiftshader',
        ],
        ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=AutomationControlled'],
        ignoreHTTPSErrors: true,
    };

    if (useRealChrome) {
        launchOptions.channel = 'chrome';
    }

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
                const delay = 3000 + Math.random() * 5000;
                console.log(`⏳ Waiting ${Math.round(delay/1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const userAgents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ];
            const selectedUserAgent = userAgent || userAgents[Math.floor(Math.random() * userAgents.length)];

            const context = await browser.newContext({
                userAgent: selectedUserAgent,
                viewport: { width: 1920, height: 1080 },
                deviceScaleFactor: 1,
                locale: 'en-US',
                timezoneId: 'America/New_York',
                colorScheme: 'light',
                extraHTTPHeaders: {
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'sec-ch-ua': '"Google Chrome";v="120", "Chromium";v="120", "Not(A:Brand";v="24"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'Upgrade-Insecure-Requests': '1',
                    'DNT': '1',
                },
            });

            // ============================================
            // ULTRA STEALTH INJECTIONS
            // ============================================

            // 1. COMPLETE webdriver removal (delete property, not just set to undefined)
            await context.addInitScript(() => {
                // Delete webdriver completely
                delete Object.getPrototypeOf(navigator).webdriver;
                
                // Override any getter
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                    configurable: true,
                });
                
                // Remove from navigator keys
                const originalKeys = Object.keys(navigator);
                Object.keys = function() {
                    return originalKeys.filter(key => key !== 'webdriver');
                };
            });

            // 2. Hardware properties - FORCE override
            await context.addInitScript(() => {
                Object.defineProperties(navigator, {
                    hardwareConcurrency: {
                        get: () => 8,
                        configurable: true,
                        enumerable: true,
                    },
                    deviceMemory: {
                        get: () => 8,
                        configurable: true,
                        enumerable: true,
                    },
                    maxTouchPoints: {
                        get: () => 0,
                        configurable: true,
                        enumerable: true,
                    },
                });
            });

            // 3. Plugins with full interface
            await context.addInitScript(() => {
                const plugins = [
                    {
                        0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' },
                        description: 'Portable Document Format',
                        filename: 'internal-pdf-viewer',
                        length: 1,
                        name: 'Chrome PDF Plugin',
                        item: function(index) { return this[index] || null; },
                        namedItem: function(name) { return this[name] || null; },
                    },
                    {
                        0: { type: 'application/pdf', suffixes: 'pdf', description: '' },
                        description: '',
                        filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
                        length: 1,
                        name: 'Chrome PDF Viewer',
                        item: function(index) { return this[index] || null; },
                        namedItem: function(name) { return this[name] || null; },
                    },
                    {
                        0: { type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable' },
                        description: '',
                        filename: 'internal-nacl-plugin',
                        length: 1,
                        name: 'Native Client',
                        item: function(index) { return this[index] || null; },
                        namedItem: function(name) { return this[name] || null; },
                    }
                ];

                Object.defineProperty(navigator, 'plugins', {
                    get: () => {
                        plugins.length = 3;
                        plugins.item = (i) => plugins[i] || null;
                        plugins.namedItem = (name) => plugins.find(p => p.name === name) || null;
                        plugins.refresh = () => {};
                        return plugins;
                    },
                    configurable: true,
                    enumerable: true,
                });
            });

            // 4. Chrome object - full mock
            await context.addInitScript(() => {
                if (!window.chrome) {
                    window.chrome = {};
                }

                Object.assign(window.chrome, {
                    app: {
                        isInstalled: false,
                        InstallState: {
                            DISABLED: 'disabled',
                            INSTALLED: 'installed',
                            NOT_INSTALLED: 'not_installed'
                        },
                        RunningState: {
                            CANNOT_RUN: 'cannot_run',
                            READY_TO_RUN: 'ready_to_run',
                            RUNNING: 'running'
                        },
                        getDetails: () => null,
                        getIsInstalled: () => false,
                        installState: () => 'not_installed',
                        runningState: () => 'cannot_run',
                    },
                    runtime: {
                        OnInstalledReason: {
                            CHROME_UPDATE: 'chrome_update',
                            INSTALL: 'install',
                            SHARED_MODULE_UPDATE: 'shared_module_update',
                            UPDATE: 'update',
                        },
                        OnRestartRequiredReason: {
                            APP_UPDATE: 'app_update',
                            OS_UPDATE: 'os_update',
                            PERIODIC: 'periodic',
                        },
                        PlatformArch: {
                            ARM: 'arm',
                            ARM64: 'arm64',
                            MIPS: 'mips',
                            MIPS64: 'mips64',
                            X86_32: 'x86-32',
                            X86_64: 'x86-64',
                        },
                        PlatformOs: {
                            ANDROID: 'android',
                            CROS: 'cros',
                            LINUX: 'linux',
                            MAC: 'mac',
                            OPENBSD: 'openbsd',
                            WIN: 'win',
                        },
                        connect: () => {},
                        sendMessage: () => {},
                    },
                    csi: function() {
                        return {
                            startE: Date.now(),
                            onloadT: Date.now(),
                            pageT: Math.random() * 1000,
                            tran: 15
                        };
                    },
                    loadTimes: function() {
                        const now = Date.now() / 1000;
                        return {
                            requestTime: now,
                            startLoadTime: now,
                            commitLoadTime: now + 0.1,
                            finishDocumentLoadTime: now + 0.3,
                            finishLoadTime: now + 0.7,
                            firstPaintTime: now + 0.3,
                            firstPaintAfterLoadTime: 0,
                            navigationType: 'Other',
                            wasFetchedViaSpdy: true,
                            wasNpnNegotiated: true,
                            npnNegotiatedProtocol: 'h2',
                            wasAlternateProtocolAvailable: false,
                            connectionInfo: 'h2'
                        };
                    }
                });
            });

            // 5. Permissions API consistency
            await context.addInitScript(() => {
                const originalQuery = navigator.permissions.query;
                navigator.permissions.query = function(parameters) {
                    if (parameters.name === 'notifications') {
                        return Promise.resolve({
                            state: Notification.permission,
                            onchange: null
                        });
                    }
                    return originalQuery.call(navigator.permissions, parameters);
                };
            });

            // 6. WebGL spoofing
            await context.addInitScript(() => {
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(parameter) {
                    if (parameter === 37445) return 'Intel Inc.';
                    if (parameter === 37446) return 'Intel Iris OpenGL Engine';
                    return getParameter.call(this, parameter);
                };

                if (typeof WebGL2RenderingContext !== 'undefined') {
                    const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
                    WebGL2RenderingContext.prototype.getParameter = function(parameter) {
                        if (parameter === 37445) return 'Intel Inc.';
                        if (parameter === 37446) return 'Intel Iris OpenGL Engine';
                        return getParameter2.call(this, parameter);
                    };
                }
            });

            // 7. Canvas noise
            await context.addInitScript(() => {
                const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
                HTMLCanvasElement.prototype.toDataURL = function(...args) {
                    const context2d = this.getContext('2d');
                    if (context2d && this.width > 0 && this.height > 0) {
                        try {
                            const imageData = context2d.getImageData(0, 0, this.width, this.height);
                            for (let i = 0; i < imageData.data.length; i += 4) {
                                if (Math.random() < 0.01) {
                                    imageData.data[i] += Math.floor(Math.random() * 5) - 2;
                                }
                            }
                            context2d.putImageData(imageData, 0, 0);
                        } catch (e) {
                            // Ignore errors
                        }
                    }
                    return originalToDataURL.apply(this, args);
                };
            });

            // 8. Languages array
            await context.addInitScript(() => {
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en'],
                    configurable: true,
                    enumerable: true,
                });
            });

            const page = await context.newPage();

            // Get CDP session for low-level modifications
            const cdpSession = await page.context().newCDPSession(page);
            
            // Disable automation flags at CDP level
            await cdpSession.send('Page.addScriptToEvaluateOnNewDocument', {
                source: `
                    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                    window.navigator.chrome = {
                        runtime: {},
                        loadTimes: function() {},
                        csi: function() {},
                        app: {}
                    };
                `
            });

            try {
                // Human-like delay
                await page.waitForTimeout(1000 + Math.random() * 2000);

                console.log(`🌐 Navigating to: ${searchUrl.substring(0, 80)}...`);

                await page.goto(searchUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                });

                // Simulate human behavior
                await page.mouse.move(100 + Math.random() * 400, 100 + Math.random() * 400);
                await page.waitForTimeout(500 + Math.random() * 1000);
                
                await page.evaluate(() => {
                    window.scrollBy({ top: 200 + Math.random() * 300, behavior: 'smooth' });
                });
                await page.waitForTimeout(1000 + Math.random() * 1500);

                // Check detection
                const pageUrl = page.url();
                const isBlocked = pageUrl.includes('sorry') || pageUrl.includes('blocked');

                if (isBlocked) {
                    console.log('🚫 BLOCKED - Google detected automation');
                    console.log(`   URL: ${pageUrl.substring(0, 100)}...`);
                    
                    // Get page content for analysis
                    const bodyText = await page.evaluate(() => document.body.textContent.substring(0, 300));
                    console.log(`   Content: ${bodyText.substring(0, 150)}...`);
                    
                } else {
                    console.log('✅ SUCCESS - Page loaded without blocking!');
                    
                    // Extract results
                    const pageResults = await page.evaluate(() => {
                        const results = [];
                        const resultElements = document.querySelectorAll('div.g, div[data-sokoban-container]');
                        
                        resultElements.forEach((element, index) => {
                            try {
                                const titleElement = element.querySelector('h3');
                                const linkElement = element.querySelector('a');
                                const snippetElement = element.querySelector('.VwiC3b, span, div span');
                                
                                if (titleElement && linkElement) {
                                    const title = titleElement.textContent.trim();
                                    const url = linkElement.href;
                                    const snippet = snippetElement ? snippetElement.textContent.trim() : '';
                                    
                                    if (title && url && url.startsWith('http') && !url.includes('google.com')) {
                                        results.push({
                                            title,
                                            url,
                                            snippet,
                                            position: index + 1,
                                            engine: 'google'
                                        });
                                    }
                                }
                            } catch (error) {
                                // Skip errors
                            }
                        });
                        
                        return results;
                    });

                    if (pageResults && pageResults.length > 0) {
                        const updatedResults = pageResults.map(result => ({
                            ...result,
                            position: result.position + offset,
                            page: pageNum
                        }));

                        allResults.push(...updatedResults);
                        console.log(`✅ Found ${pageResults.length} results (total: ${allResults.length})`);

                        if (allResults.length >= maxResults) {
                            await page.close();
                            await context.close();
                            break;
                        }
                    } else {
                        console.log(`⚠️ No results found on page ${pageNum}`);
                    }
                }

            } catch (error) {
                console.error(`❌ Error: ${error.message}`);
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
async function testUltraStealth() {
    console.log('🧪 Testing ULTRA STEALTH Parser');
    console.log('='.repeat(70));
    console.log('⚠️  Google still requires residential proxies for reliable results');
    console.log('='.repeat(70));
    console.log('');

    try {
        const results = await searchGoogleUltraStealth('test query', 10, 1, {
            headless: false,
            useRealChrome: true,
            // proxy: { server: 'http://your-proxy.com:8080', username: 'user', password: 'pass' }
        });

        if (results.length > 0) {
            console.log('\n📊 Results:');
            results.forEach((result, idx) => {
                console.log(`${idx + 1}. ${result.title}`);
                console.log(`   ${result.url}`);
                console.log('');
            });
        } else {
            console.log('\n❌ No results - still blocked by Google');
            console.log('💡 Solution: Configure residential proxy in options');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    testUltraStealth().then(() => process.exit(0)).catch(error => {
        console.error(error);
        process.exit(1);
    });
}

export { searchGoogleUltraStealth };

