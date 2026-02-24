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
 * Last Updated: 2025-12-28T15:36:20
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Google Search Parser with Advanced Stealth
 * Uses playwright-extra with stealth plugin and comprehensive evasions
 * 
 * Features:
 * - 16 evasion modules from stealth plugin
 * - Custom JS injections for deep fingerprint masking
 * - Residential proxy support with rotation
 * - Human-like behavior simulation
 * - Real Chrome channel support
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Apply all 16 evasion modules
chromium.use(StealthPlugin());

/**
 * Search Google with advanced stealth techniques
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum number of results to return
 * @param {number} maxPages - Maximum number of pages to scrape
 * @param {object} options - Additional options (proxy, headless mode)
 * @returns {Promise<Array>} Array of search results
 */
async function searchGoogle(query, maxResults = 10, maxPages = 1, options = {}) {
    const {
        headless = false,  // Headed mode is significantly less detectable
        useRealChrome = true,  // Use real Chrome instead of Chromium
        proxy = null,  // { server, username, password }
        userAgent = null,  // Custom user agent (random if not provided)
    } = options;

    const allResults = [];
    const resultsPerPage = 10;

    console.log(`🔍 Searching Google for: "${query}" (${maxPages} pages, ${maxResults} max results)`);
    console.log(`🎭 Stealth mode: ${headless ? 'headless' : 'headed'} | Chrome: ${useRealChrome ? 'real' : 'chromium'}`);

    // Launch configuration with optimal flags
    const launchOptions = {
        headless: headless,
        args: [
            '--disable-blink-features=AutomationControlled',  // Critical for avoiding detection
            '--disable-extensions',
            '--disable-infobars',
            '--no-first-run',
            '--enable-webgl',
            '--use-gl=swiftshader',
            '--enable-accelerated-2d-canvas',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ],
        ignoreDefaultArgs: ['--enable-automation'],  // Removes automation banner
        ignoreHTTPSErrors: true,
    };

    // Use real Chrome for better fingerprint
    if (useRealChrome) {
        launchOptions.channel = 'chrome';
    }

    // Add proxy if provided
    if (proxy) {
        launchOptions.proxy = proxy;
        console.log(`🌐 Using proxy: ${proxy.server}`);
    }

    const browser = await chromium.launch(launchOptions);

    try {
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const offset = (pageNum - 1) * resultsPerPage;
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${offset}&num=10&hl=en`;

            console.log(`📄 Processing page ${pageNum}/${maxPages} (offset: ${offset})`);

            // Random delay between pages (2-8 seconds)
            if (pageNum > 1) {
                const delay = 2000 + Math.random() * 6000;
                console.log(`⏳ Waiting ${Math.round(delay/1000)}s before next page...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            // Select random realistic user agent
            const userAgents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            ];
            const selectedUserAgent = userAgent || userAgents[Math.floor(Math.random() * userAgents.length)];

            // Create context with realistic fingerprint
            const context = await browser.newContext({
                userAgent: selectedUserAgent,
                viewport: { width: 1920, height: 1080 },
                deviceScaleFactor: 1,
                locale: 'en-US',
                timezoneId: 'America/New_York',
                colorScheme: 'light',
                extraHTTPHeaders: {
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'sec-ch-ua': '"Google Chrome";v="120", "Chromium";v="120", "Not(A:Brand";v="24"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                },
            });

            // ============================================
            // CUSTOM JS INJECTIONS FOR DEEP EVASION
            // ============================================

            // 1. Navigator.webdriver - Proxy-based fix (from GitHub #527)
            // This is the most reliable method that passes all detection tests
            await context.addInitScript(() => {
                // Proxy-based solution from @metinc (GitHub playwright/playwright-python#527)
                // Works by intercepting the getter and returning false
                const defaultGetter = Object.getOwnPropertyDescriptor(
                    Navigator.prototype,
                    "webdriver"
                ).get;
                
                defaultGetter.apply(navigator);
                defaultGetter.toString();
                
                Object.defineProperty(Navigator.prototype, "webdriver", {
                    set: undefined,
                    enumerable: true,
                    configurable: true,
                    get: new Proxy(defaultGetter, {
                        apply: (target, thisArg, args) => {
                            Reflect.apply(target, thisArg, args);
                            return false;  // Return false instead of true
                        },
                    }),
                });
                
                const patchedGetter = Object.getOwnPropertyDescriptor(
                    Navigator.prototype,
                    "webdriver"
                ).get;
                patchedGetter.apply(navigator);
                patchedGetter.toString();
            });

            // 2. Navigator.plugins - MUST be proper PluginArray type
            await context.addInitScript(() => {
                // Create a proper PluginArray-like object
                const createPlugin = (name, description, filename, mimeTypes) => {
                    const plugin = {
                        name,
                        description,
                        filename,
                        length: mimeTypes.length,
                    };
                    
                    // Add mimeTypes as indexed properties
                    mimeTypes.forEach((mt, i) => {
                        plugin[i] = {
                            type: mt.type,
                            suffixes: mt.suffixes,
                            description: mt.description,
                            enabledPlugin: plugin,
                        };
                    });
                    
                    // Make it look like Plugin
                    plugin.item = function(index) { return this[index] || null; };
                    plugin.namedItem = function(name) { 
                        for (let i = 0; i < this.length; i++) {
                            if (this[i] && this[i].type === name) return this[i];
                        }
                        return null;
                    };
                    plugin[Symbol.iterator] = function* () {
                        for (let i = 0; i < this.length; i++) yield this[i];
                    };
                    
                    // Set prototype to Plugin
                    Object.setPrototypeOf(plugin, Plugin.prototype);
                    return plugin;
                };
                
                const plugins = [
                    createPlugin('Chrome PDF Plugin', 'Portable Document Format', 'internal-pdf-viewer', [
                        { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' }
                    ]),
                    createPlugin('Chrome PDF Viewer', '', 'mhjfbmdgcfjbbpaeojofohoefgiehjai', [
                        { type: 'application/pdf', suffixes: 'pdf', description: '' }
                    ]),
                    createPlugin('Native Client', '', 'internal-nacl-plugin', [
                        { type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable' },
                        { type: 'application/x-pnacl', suffixes: '', description: 'Portable Native Client Executable' }
                    ]),
                ];
                
                // Create PluginArray-like object
                const pluginArray = {
                    length: plugins.length,
                    item: function(index) { return plugins[index] || null; },
                    namedItem: function(name) { return plugins.find(p => p.name === name) || null; },
                    refresh: function() {},
                    [Symbol.iterator]: function* () {
                        for (let i = 0; i < plugins.length; i++) yield plugins[i];
                    },
                };
                
                // Add indexed access
                plugins.forEach((p, i) => { pluginArray[i] = p; });
                
                // Set prototype to PluginArray
                Object.setPrototypeOf(pluginArray, PluginArray.prototype);
                
                Object.defineProperty(navigator, 'plugins', {
                    get: () => pluginArray,
                    configurable: true,
                    enumerable: true,
                });
            });

            // 3. Window.chrome object mocking - COMPLETE with proper methods
            await context.addInitScript(() => {
                // Create a more complete chrome object
                window.chrome = {
                    app: { 
                        isInstalled: false,
                        getDetails: function() { return null; },
                        getIsInstalled: function() { return false; },
                        installState: function(callback) { 
                            if (callback) callback('not_installed'); 
                            return 'not_installed'; 
                        },
                        runningState: function() { return 'cannot_run'; },
                        InstallState: { 
                            DISABLED: 'disabled', 
                            INSTALLED: 'installed', 
                            NOT_INSTALLED: 'not_installed' 
                        },
                        RunningState: {
                            CANNOT_RUN: 'cannot_run',
                            READY_TO_RUN: 'ready_to_run',
                            RUNNING: 'running',
                        }
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
                        PlatformNaclArch: {
                            ARM: 'arm',
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
                        RequestUpdateCheckStatus: {
                            NO_UPDATE: 'no_update',
                            THROTTLED: 'throttled',
                            UPDATE_AVAILABLE: 'update_available',
                        },
                        // These need to be proper functions that don't throw errors
                        connect: function(extensionId, connectInfo) {
                            return {
                                name: '',
                                sender: undefined,
                                disconnect: function() {},
                                onDisconnect: { addListener: function() {}, removeListener: function() {} },
                                onMessage: { addListener: function() {}, removeListener: function() {} },
                                postMessage: function() {},
                            };
                        },
                        sendMessage: function(extensionId, message, options, callback) {
                            if (typeof callback === 'function') callback();
                        },
                        getManifest: function() { return {}; },
                        getURL: function(path) { return ''; },
                        id: undefined,
                    },
                    csi: function() {
                        return { 
                            startE: Date.now(), 
                            onloadT: Date.now(), 
                            pageT: Math.random() * 1000 + 100, 
                            tran: 15 
                        };
                    },
                    loadTimes: function() {
                        const now = Date.now() / 1000;
                        return {
                            requestTime: now - 0.5,
                            startLoadTime: now - 0.4,
                            commitLoadTime: now - 0.3,
                            finishDocumentLoadTime: now - 0.1,
                            finishLoadTime: now,
                            firstPaintTime: now - 0.2,
                            firstPaintAfterLoadTime: 0,
                            navigationType: 'Other',
                            wasFetchedViaSpdy: true,
                            wasNpnNegotiated: true,
                            npnNegotiatedProtocol: 'h2',
                            wasAlternateProtocolAvailable: false,
                            connectionInfo: 'h2'
                        };
                    }
                };
            });

            // 4. Permissions API consistency
            await context.addInitScript(() => {
                const originalQuery = navigator.permissions.query;
                navigator.permissions.query = (parameters) => {
                    return new Promise((resolve) => {
                        if (parameters.name === 'notifications') {
                            resolve({ state: Notification.permission, onchange: null });
                        } else {
                            originalQuery.call(navigator.permissions, parameters).then(resolve);
                        }
                    });
                };
            });

            // 5. Hardware properties
            await context.addInitScript(() => {
                Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
                Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
                Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
            });

            // 6. WebGL vendor/renderer spoofing
            await context.addInitScript(() => {
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(parameter) {
                    if (parameter === 37445) return 'Intel Inc.';
                    if (parameter === 37446) return 'Intel Iris OpenGL Engine';
                    return getParameter.call(this, parameter);
                };

                const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
                WebGL2RenderingContext.prototype.getParameter = function(parameter) {
                    if (parameter === 37445) return 'Intel Inc.';
                    if (parameter === 37446) return 'Intel Iris OpenGL Engine';
                    return getParameter2.call(this, parameter);
                };
            });

            // 7. Canvas fingerprint noise injection
            await context.addInitScript(() => {
                const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
                HTMLCanvasElement.prototype.toDataURL = function(...args) {
                    const context2d = this.getContext('2d');
                    if (context2d && this.width > 0 && this.height > 0) {
                        const imageData = context2d.getImageData(0, 0, this.width, this.height);
                        for (let i = 0; i < imageData.data.length; i += 4) {
                            if (Math.random() < 0.01) {
                                imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + Math.floor(Math.random() * 4) - 2));
                            }
                        }
                        context2d.putImageData(imageData, 0, 0);
                    }
                    return originalToDataURL.apply(this, args);
                };
            });

            const page = await context.newPage();

            // Block unnecessary resources for faster loading
            await page.route('**/*', route => {
                const type = route.request().resourceType();
                const url = route.request().url();

                if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                    return route.abort();
                }

                if (url.includes('google-analytics') ||
                    url.includes('googletagmanager') ||
                    url.includes('doubleclick') ||
                    url.includes('googlesyndication')) {
                    return route.abort();
                }

                return route.continue();
            });

            try {
                // Human-like delay before navigation
                await page.waitForTimeout(Math.random() * 2000 + 500);

                // Navigate to search page
                await page.goto(searchUrl, { 
                    waitUntil: 'domcontentloaded',
                    timeout: 60000 
                });

                // Simulate human behavior
                await page.mouse.move(Math.random() * 800, Math.random() * 600);
                await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
                await page.waitForTimeout(Math.random() * 1500 + 500);

                // Check for CAPTCHA or blocking
                const captcha = await page.$('form#captcha-form, #captcha-form, iframe[src*="recaptcha"]');
                const sorryPage = page.url().includes('/sorry/');
                
                if (captcha || sorryPage) {
                    console.log('🚫 CAPTCHA or blocking detected');
                    const pageTitle = await page.title();
                    const pageUrl = page.url();
                    console.log(`📄 Title: "${pageTitle}"`);
                    console.log(`📄 URL: ${pageUrl}`);
                    
                    await page.close();
                    await context.close();
                    continue;
                }

                // Wait for results to load
                await page.waitForTimeout(2000);

                // Extract search results
                const pageResults = await page.evaluate(() => {
                    const results = [];
                    
                    // Google's main search result selector
                    const resultElements = document.querySelectorAll('div.g, div[data-sokoban-container]');
                    
                    resultElements.forEach((element, index) => {
                        try {
                            const titleElement = element.querySelector('h3');
                            const linkElement = element.querySelector('a');
                            const snippetElement = element.querySelector('div[data-sncf], .VwiC3b, span');
                            
                            if (titleElement && linkElement) {
                                const title = titleElement.textContent.trim();
                                const url = linkElement.href;
                                const snippet = snippetElement ? snippetElement.textContent.trim() : '';
                                
                                // Filter out non-organic results
                                if (title && url && url.startsWith('http') && !url.includes('google.com')) {
                                    results.push({
                                        title,
                                        url,
                                        snippet,
                                        position: index + 1,
                                        page: 1,
                                        engine: 'google'
                                    });
                                }
                            }
                        } catch (error) {
                            console.warn(`Error parsing result ${index + 1}:`, error.message);
                        }
                    });
                    
                    return results;
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
                        await page.close();
                        await context.close();
                        break;
                    }
                } else {
                    console.log(`⚠️ Page ${pageNum}: No results found`);
                }

            } catch (error) {
                console.error(`❌ Error on page ${pageNum}:`, error.message);
            } finally {
                await page.close();
                await context.close();
            }
        }

        // Limit results to maxResults
        const finalResults = allResults.slice(0, maxResults);

        console.log(`🎉 Scraping complete: Found ${finalResults.length} results across ${Math.ceil(finalResults.length / resultsPerPage)} pages`);

        return finalResults;

    } finally {
        await browser.close();
        console.log('🛑 Browser closed');
    }
}

// Test function
async function testStealthParser() {
    try {
        console.log('🧪 Testing Advanced Stealth Google Parser');
        console.log('='.repeat(70));
        console.log('⚠️  Note: For best results, configure residential proxy');
        console.log('='.repeat(70));

        // Test 1: Single page search
        console.log('\n📄 TEST 1: Single page search (headed mode)');
        console.log('-'.repeat(50));

        const results = await searchGoogle('how to improve seo', 10, 1, {
            headless: false,  // Headed mode is less detectable
            useRealChrome: true,  // Use real Chrome
            // proxy: {  // Uncomment and configure for production
            //     server: 'http://your-proxy.com:8080',
            //     username: 'user',
            //     password: 'pass'
            // }
        });

        console.log(`\n📊 Results: ${results.length}\n`);

        results.slice(0, 5).forEach((result, index) => {
            console.log(`${index + 1}. ${result.title}`);
            console.log(`   URL: ${result.url}`);
            console.log(`   Snippet: ${result.snippet.substring(0, 100)}...`);
            console.log('');
        });

        if (results.length === 0) {
            console.log('❌ No results found - likely blocked by Google');
            console.log('💡 Recommendations:');
            console.log('   1. Configure residential proxy in the options');
            console.log('   2. Reduce request frequency (max 8 requests/hour/proxy)');
            console.log('   3. Try headed mode (headless: false)');
            console.log('   4. Consider using Yahoo parser as alternative');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error(error.stack);
    }
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testStealthParser()
        .then(() => {
            console.log('✅ Test completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Test failed:', error);
            process.exit(1);
        });
}

export { searchGoogle };

