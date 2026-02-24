#!/usr/bin/env node
/**
 * Copyright (c) 2025 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2025-12-28T15:02:08
 * Last Updated: 2025-12-28T15:07:58
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Console Checker for Google
 * Checks browser console messages, network requests, and page state
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

chromium.use(StealthPlugin());

async function checkGoogleConsole() {
    console.log('🔍 Starting Google Console Check...\n');
    
    const browser = await chromium.launch({
        headless: false,  // Visual mode
        channel: 'chrome',
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-extensions',
            '--disable-infobars',
        ],
        ignoreDefaultArgs: ['--enable-automation'],
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
    });

    // ============================================
    // FIX 1: COMPLETE webdriver REMOVAL with ADVANCED DETECTION BYPASS
    // ============================================
    await context.addInitScript(() => {
        // Step 1: Delete webdriver from navigator prototype
        const navigatorPrototype = Object.getPrototypeOf(navigator);
        try {
            delete navigatorPrototype.webdriver;
        } catch (e) {}
        
        // Step 2: Create native-looking getter function
        const webdriverGetter = function() { return undefined; };
        
        // Step 3: Mask Function.prototype.toString for webDriverAdvanced test
        const originalFunctionToString = Function.prototype.toString;
        Function.prototype.toString = function() {
            if (this === webdriverGetter) {
                return 'function webdriver() { [native code] }';
            }
            return originalFunctionToString.call(this);
        };
        
        // Step 4: Define webdriver with native-looking getter
        Object.defineProperty(navigator, 'webdriver', {
            get: webdriverGetter,
            set: () => {},
            configurable: true,
            enumerable: false,
        });
        
        // Don't add to prototype - it causes hasOwnProperty to return true
        // Object.defineProperty(navigatorPrototype, 'webdriver', {
        //     get: webdriverGetter,
        //     configurable: true,
        //     enumerable: false,
        // });
        
        // Step 5: Override Object.getOwnPropertyNames to hide webdriver
        const originalGetOwnPropertyNames = Object.getOwnPropertyNames;
        Object.getOwnPropertyNames = function(obj) {
            const props = originalGetOwnPropertyNames.call(Object, obj);
            if (obj === navigator) {
                return props.filter(p => p !== 'webdriver');
            }
            return props;
        };
        
        // Step 6: Override Object.getOwnPropertyDescriptor
        const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
        Object.getOwnPropertyDescriptor = function(obj, prop) {
            if ((obj === navigator || obj === navigatorPrototype) && prop === 'webdriver') {
                return undefined;
            }
            return originalGetOwnPropertyDescriptor.call(Object, obj, prop);
        };
        
        // Step 7: Override Reflect methods
        const originalReflectHas = Reflect.has;
        Reflect.has = function(target, property) {
            if (target === navigator && property === 'webdriver') {
                return false;
            }
            return originalReflectHas.call(Reflect, target, property);
        };
        
        const originalReflectGetOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
        Reflect.getOwnPropertyDescriptor = function(target, prop) {
            if ((target === navigator || target === navigatorPrototype) && prop === 'webdriver') {
                return undefined;
            }
            return originalReflectGetOwnPropertyDescriptor.call(Reflect, target, prop);
        };
        
        // Step 8: Override hasOwnProperty
        const originalHasOwnProperty = Object.prototype.hasOwnProperty;
        Object.prototype.hasOwnProperty = function(prop) {
            if (this === navigator && prop === 'webdriver') return false;
            return originalHasOwnProperty.call(this, prop);
        };
    });

    // ============================================
    // FIX 2: FORCE hardwareConcurrency to 8
    // (configurable: true to avoid "Cannot redefine" errors)
    // ============================================
    await context.addInitScript(() => {
        // Delete existing property first
        const navigatorPrototype = Object.getPrototypeOf(navigator);
        
        // Remove from prototype
        try {
            delete navigatorPrototype.hardwareConcurrency;
            delete navigatorPrototype.deviceMemory;
        } catch (e) {}
        
        // Use a closure to lock the value
        const HARDWARE_CONCURRENCY = 8;
        const DEVICE_MEMORY = 8;
        
        // Define property that returns fixed value but allows reconfiguration
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: function() { return HARDWARE_CONCURRENCY; },
            configurable: true,  // Allow reconfiguration to avoid errors
            enumerable: true,
        });
        
        // Override deviceMemory
        Object.defineProperty(navigator, 'deviceMemory', {
            get: function() { return DEVICE_MEMORY; },
            configurable: true,
            enumerable: true,
        });
        
        // Intercept any attempts to redefine these properties
        const originalDefineProperty = Object.defineProperty;
        Object.defineProperty = function(obj, prop, descriptor) {
            // If trying to redefine our protected properties on navigator
            if (obj === navigator && (prop === 'hardwareConcurrency' || prop === 'deviceMemory')) {
                // Return silently without actually redefining
                return obj;
            }
            // Make sure descriptor is valid before calling
            if (descriptor === undefined || descriptor === null) {
                return obj;
            }
            try {
                return originalDefineProperty.call(Object, obj, prop, descriptor);
            } catch (e) {
                // If redefinition fails, return object silently
                return obj;
            }
        };
    });

    // ============================================
    // OTHER STEALTH INJECTIONS
    // ============================================
    await context.addInitScript(() => {
        // Chrome object
        window.chrome = {
            runtime: {
                connect: () => {},
                sendMessage: () => {},
            },
            csi: () => ({ startE: Date.now(), onloadT: Date.now(), pageT: 100, tran: 15 }),
            loadTimes: () => ({ 
                requestTime: Date.now() / 1000,
                startLoadTime: Date.now() / 1000,
                finishLoadTime: Date.now() / 1000 + 0.5,
            }),
            app: {
                isInstalled: false,
                InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
            },
        };
        
        // Plugins - PROPER PluginArray type
        const createPlugin = (name, description, filename, mimeTypes) => {
            const plugin = { name, description, filename, length: mimeTypes.length };
            mimeTypes.forEach((mt, i) => {
                plugin[i] = { type: mt.type, suffixes: mt.suffixes, description: mt.description, enabledPlugin: plugin };
            });
            plugin.item = function(index) { return this[index] || null; };
            plugin.namedItem = function(name) { 
                for (let i = 0; i < this.length; i++) if (this[i]?.type === name) return this[i];
                return null;
            };
            plugin[Symbol.iterator] = function* () { for (let i = 0; i < this.length; i++) yield this[i]; };
            Object.setPrototypeOf(plugin, Plugin.prototype);
            return plugin;
        };
        
        const plugins = [
            createPlugin('Chrome PDF Plugin', 'Portable Document Format', 'internal-pdf-viewer', 
                [{ type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' }]),
            createPlugin('Chrome PDF Viewer', '', 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
                [{ type: 'application/pdf', suffixes: 'pdf', description: '' }]),
            createPlugin('Native Client', '', 'internal-nacl-plugin',
                [{ type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable' }]),
        ];
        
        const pluginArray = {
            length: plugins.length,
            item: function(index) { return plugins[index] || null; },
            namedItem: function(name) { return plugins.find(p => p.name === name) || null; },
            refresh: function() {},
            [Symbol.iterator]: function* () { for (let i = 0; i < plugins.length; i++) yield plugins[i]; },
        };
        plugins.forEach((p, i) => { pluginArray[i] = p; });
        Object.setPrototypeOf(pluginArray, PluginArray.prototype);
        
        Object.defineProperty(navigator, 'plugins', {
            get: () => pluginArray,
            configurable: true,
            enumerable: true,
        });
        
        // Languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
            configurable: false,
            enumerable: true,
        });
        
        // maxTouchPoints
        Object.defineProperty(navigator, 'maxTouchPoints', {
            get: () => 0,
            configurable: false,
            enumerable: true,
        });
    });

    const page = await context.newPage();
    
    // Array to store all logs
    const logs = {
        console: [],
        network: [],
        errors: [],
        responses: []
    };

    // Listen to console messages
    page.on('console', msg => {
        const log = {
            type: msg.type(),
            text: msg.text(),
            location: msg.location(),
            timestamp: new Date().toISOString()
        };
        logs.console.push(log);
        console.log(`📝 CONSOLE [${msg.type()}]:`, msg.text());
    });

    // Listen to page errors
    page.on('pageerror', error => {
        const log = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        logs.errors.push(log);
        console.log('🚨 PAGE ERROR:', error.message);
    });

    // Listen to requests
    page.on('request', request => {
        const url = request.url();
        const log = {
            url: url,
            method: request.method(),
            resourceType: request.resourceType(),
            timestamp: new Date().toISOString()
        };
        logs.network.push(log);
        
        // Log blocking/sorry URLs
        if (url.includes('sorry') || url.includes('blocked') || url.includes('captcha')) {
            console.log('🚫 BLOCKING REQUEST:', url);
        }
    });

    // Listen to responses
    page.on('response', async response => {
        const url = response.url();
        const status = response.status();
        
        const log = {
            url: url,
            status: status,
            statusText: response.statusText(),
            timestamp: new Date().toISOString()
        };
        logs.responses.push(log);
        
        // Log interesting status codes
        if (status === 429 || status === 403 || status === 401 || status >= 500) {
            console.log(`⚠️  HTTP ${status}:`, url);
        }
        
        // Check for CAPTCHA/blocking responses
        if (url.includes('sorry') || url.includes('blocked')) {
            console.log('🚫 BLOCKING RESPONSE:', status, url);
        }
    });

    // Listen to dialog events (alerts, confirms, etc)
    page.on('dialog', async dialog => {
        console.log('💬 DIALOG:', dialog.type(), dialog.message());
        await dialog.dismiss();
    });

    try {
        console.log('\n🌐 Navigating to Google search...\n');
        
        const response = await page.goto('https://www.google.com/search?q=how+to+improve+seo&num=10&hl=en', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log(`\n📊 Initial response status: ${response.status()} ${response.statusText()}`);
        
        // Wait for page to load
        await page.waitForTimeout(3000);

        // Get page info
        const pageUrl = page.url();
        const pageTitle = await page.title();
        
        console.log('\n📄 PAGE INFO:');
        console.log('   Title:', pageTitle);
        console.log('   URL:', pageUrl);
        console.log('   Is blocked:', pageUrl.includes('sorry') || pageUrl.includes('blocked'));

        // Check for CAPTCHA elements
        const captchaElements = await page.evaluate(() => {
            return {
                captchaForm: !!document.querySelector('form#captcha-form'),
                recaptchaIframe: !!document.querySelector('iframe[src*="recaptcha"]'),
                sorryMessage: !!document.querySelector('#sorry'),
                hasH3: document.querySelectorAll('h3').length,
                hasSearchResults: document.querySelectorAll('div.g').length,
                bodyText: document.body.textContent.substring(0, 500)
            };
        });

        console.log('\n🔍 CAPTCHA CHECK:');
        console.log('   CAPTCHA Form:', captchaElements.captchaForm);
        console.log('   reCAPTCHA Iframe:', captchaElements.recaptchaIframe);
        console.log('   Sorry Message:', captchaElements.sorryMessage);
        console.log('   H3 Elements:', captchaElements.hasH3);
        console.log('   Search Results:', captchaElements.hasSearchResults);

        // Check navigator properties - DETAILED CHECK
        const navigatorProps = await page.evaluate(() => {
            // Multiple ways to detect webdriver
            const webdriverChecks = {
                directAccess: navigator.webdriver,
                inOperator: 'webdriver' in navigator,
                hasOwnProperty: navigator.hasOwnProperty('webdriver'),
                prototypeCheck: Object.getPrototypeOf(navigator).hasOwnProperty('webdriver'),
                keysInclude: Object.keys(navigator).includes('webdriver'),
                getOwnPropertyNames: Object.getOwnPropertyNames(navigator).includes('webdriver'),
            };
            
            // webDriverAdvanced test - check Function.prototype.toString
            let webDriverAdvanced = 'OK';
            try {
                const desc = Object.getOwnPropertyDescriptor(navigator, 'webdriver') ||
                             Object.getOwnPropertyDescriptor(Object.getPrototypeOf(navigator), 'webdriver');
                if (desc && desc.get) {
                    const toStringResult = desc.get.toString();
                    // Should look like native code
                    if (!toStringResult.includes('[native code]')) {
                        webDriverAdvanced = 'FAIL - toString not native';
                    }
                }
            } catch (e) {
                webDriverAdvanced = 'OK (descriptor hidden)';
            }
            
            return {
                // Webdriver checks
                webdriver: navigator.webdriver,
                webdriverChecks: webdriverChecks,
                webDriverAdvanced: webDriverAdvanced,
                
                // Hardware
                hardwareConcurrency: navigator.hardwareConcurrency,
                deviceMemory: navigator.deviceMemory,
                maxTouchPoints: navigator.maxTouchPoints,
                
                // Other
                plugins: navigator.plugins.length,
                pluginsIsPluginArray: navigator.plugins instanceof PluginArray,
                languages: navigator.languages,
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                vendor: navigator.vendor,
                
                // Chrome object
                hasChrome: !!window.chrome,
                chromeKeys: window.chrome ? Object.keys(window.chrome) : [],
                chromeConnectType: window.chrome?.runtime?.connect ? typeof window.chrome.runtime.connect : 'missing',
            };
        });

        console.log('\n🔬 NAVIGATOR PROPERTIES:');
        console.log('');
        console.log('   📌 WEBDRIVER DETECTION TESTS:');
        console.log('   ├─ navigator.webdriver:', navigatorProps.webdriver, navigatorProps.webdriver === undefined ? '✅' : '❌');
        console.log('   ├─ "webdriver" in navigator:', navigatorProps.webdriverChecks.inOperator, !navigatorProps.webdriverChecks.inOperator ? '✅' : '❌');
        console.log('   ├─ navigator.hasOwnProperty("webdriver"):', navigatorProps.webdriverChecks.hasOwnProperty, !navigatorProps.webdriverChecks.hasOwnProperty ? '✅' : '❌');
        console.log('   ├─ prototype.hasOwnProperty("webdriver"):', navigatorProps.webdriverChecks.prototypeCheck, !navigatorProps.webdriverChecks.prototypeCheck ? '✅' : '❌');
        console.log('   ├─ Object.keys includes "webdriver":', navigatorProps.webdriverChecks.keysInclude, !navigatorProps.webdriverChecks.keysInclude ? '✅' : '❌');
        console.log('   ├─ getOwnPropertyNames includes:', navigatorProps.webdriverChecks.getOwnPropertyNames, !navigatorProps.webdriverChecks.getOwnPropertyNames ? '✅' : '❌');
        console.log('   └─ webDriverAdvanced (toString):', navigatorProps.webDriverAdvanced, navigatorProps.webDriverAdvanced.includes('OK') ? '✅' : '❌');
        console.log('');
        console.log('   📌 HARDWARE PROPERTIES:');
        console.log('   ├─ hardwareConcurrency:', navigatorProps.hardwareConcurrency, navigatorProps.hardwareConcurrency === 8 ? '✅' : '❌ (should be 8)');
        console.log('   ├─ deviceMemory:', navigatorProps.deviceMemory, navigatorProps.deviceMemory === 8 ? '✅' : '❌ (should be 8)');
        console.log('   └─ maxTouchPoints:', navigatorProps.maxTouchPoints, navigatorProps.maxTouchPoints === 0 ? '✅' : '❌');
        console.log('');
        console.log('   📌 OTHER PROPERTIES:');
        console.log('   ├─ plugins count:', navigatorProps.plugins, navigatorProps.plugins >= 2 ? '✅' : '❌');
        console.log('   ├─ plugins instanceof PluginArray:', navigatorProps.pluginsIsPluginArray, navigatorProps.pluginsIsPluginArray ? '✅' : '❌');
        console.log('   ├─ languages:', navigatorProps.languages);
        console.log('   ├─ platform:', navigatorProps.platform);
        console.log('   ├─ vendor:', navigatorProps.vendor);
        console.log('   └─ window.chrome:', navigatorProps.hasChrome ? '✅ present' : '❌ missing');
        console.log('      keys:', navigatorProps.chromeKeys);
        console.log('      runtime.connect:', navigatorProps.chromeConnectType);

        // Summary
        console.log('\n📈 SUMMARY:');
        console.log('   Console messages:', logs.console.length);
        console.log('   Page errors:', logs.errors.length);
        console.log('   Network requests:', logs.network.length);
        console.log('   Responses:', logs.responses.length);
        
        // Count 429/403 responses
        const blockedResponses = logs.responses.filter(r => r.status === 429 || r.status === 403);
        console.log('   Blocked responses (429/403):', blockedResponses.length);
        
        // Show blocked responses details
        if (blockedResponses.length > 0) {
            console.log('\n🚫 BLOCKED RESPONSES DETAILS:');
            blockedResponses.forEach((resp, idx) => {
                console.log(`   ${idx + 1}. [${resp.status}] ${resp.url.substring(0, 100)}...`);
            });
        }
        
        // Show console errors
        if (logs.errors.length > 0) {
            console.log('\n🚨 PAGE ERRORS:');
            logs.errors.forEach((err, idx) => {
                console.log(`   ${idx + 1}. ${err.message}`);
            });
        }
        
        // Show important console messages
        const importantConsole = logs.console.filter(l => 
            l.type === 'error' || l.type === 'warning' || l.text.includes('blocked') || l.text.includes('captcha')
        );
        if (importantConsole.length > 0) {
            console.log('\n⚠️  IMPORTANT CONSOLE MESSAGES:');
            importantConsole.forEach((log, idx) => {
                console.log(`   ${idx + 1}. [${log.type}] ${log.text.substring(0, 150)}`);
            });
        }
        
        // Show redirects to /sorry
        const sorryRedirects = logs.network.filter(r => r.url.includes('/sorry'));
        if (sorryRedirects.length > 0) {
            console.log('\n🔴 REDIRECTS TO /sorry PAGE:');
            sorryRedirects.forEach((req, idx) => {
                console.log(`   ${idx + 1}. ${req.method} ${req.url.substring(0, 120)}...`);
            });
        }

        // Show some body text if blocked
        if (pageUrl.includes('sorry')) {
            console.log('\n📄 BODY TEXT (first 500 chars):');
            console.log(captchaElements.bodyText);
        }

        // Take screenshot for analysis
        await page.screenshot({ path: 'google_blocked.png', fullPage: true });
        console.log('\n📸 Screenshot saved to: google_blocked.png');
        
        console.log('\n⏸️  Page will stay open for 10 seconds for manual inspection...');
        await page.waitForTimeout(10000);
        
        // Save all logs to JSON file
        const fullReport = {
            timestamp: new Date().toISOString(),
            pageInfo: {
                url: pageUrl,
                title: pageTitle,
                isBlocked: pageUrl.includes('sorry') || pageUrl.includes('blocked')
            },
            captchaCheck: captchaElements,
            navigatorProps: navigatorProps,
            logs: logs,
            summary: {
                consoleMessages: logs.console.length,
                pageErrors: logs.errors.length,
                networkRequests: logs.network.length,
                responses: logs.responses.length,
                blockedResponses: blockedResponses.length
            }
        };
        
        fs.writeFileSync('google_debug_logs.json', JSON.stringify(fullReport, null, 2));
        console.log('💾 Full debug report saved to: google_debug_logs.json');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
    } finally {
        await browser.close();
        console.log('\n✅ Browser closed');
    }
}

checkGoogleConsole().catch(console.error);

