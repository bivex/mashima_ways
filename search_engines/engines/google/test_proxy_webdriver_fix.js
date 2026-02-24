#!/usr/bin/env node
/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-24 23:56
 * Last Updated: 2026-02-24 23:56
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Test the Proxy-based webdriver fix from GitHub issue #527
 * This works in pure Playwright without stealth plugins
 */

import { chromium } from 'playwright';

async function testProxyWebdriverFix() {
    console.log('🧪 Testing Proxy-based webdriver fix (GitHub #527)');
    console.log('='.repeat(60));
    console.log('');

    const browser = await chromium.launch({
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
        ],
        ignoreDefaultArgs: ['--enable-automation'],
    });

    try {
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
        });

        // Apply the Proxy-based fix from @metinc (GitHub #527)
        await context.addInitScript(() => {
            // Solution from: https://github.com/nicnocquee/puppeteer-proxy-override
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

        const page = await context.newPage();

        console.log('🌐 Navigating to bot.sannysoft.com...');
        await page.goto('https://bot.sannysoft.com/', {
            waitUntil: 'networkidle',
            timeout: 60000
        });

        await page.waitForTimeout(3000);

        // Check navigator properties
        const results = await page.evaluate(() => {
            const webdriverDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver');
            
            return {
                // Basic checks
                webdriver: navigator.webdriver,
                webdriverType: typeof navigator.webdriver,
                
                // Advanced checks
                webdriverInNavigator: 'webdriver' in navigator,
                navigatorHasOwn: navigator.hasOwnProperty('webdriver'),
                prototypeHasOwn: Navigator.prototype.hasOwnProperty('webdriver'),
                
                // Descriptor info
                descriptorExists: !!webdriverDesc,
                getterType: webdriverDesc ? typeof webdriverDesc.get : null,
                
                // toString check (important for detection)
                getterToString: webdriverDesc?.get?.toString?.() || 'N/A',
                
                // Other checks
                plugins: navigator.plugins.length,
                hardwareConcurrency: navigator.hardwareConcurrency,
            };
        });

        console.log('\n📊 Results with Proxy fix:');
        console.log('='.repeat(50));
        console.log(`  navigator.webdriver: ${results.webdriver} ${results.webdriver === false ? '✅' : '❌'}`);
        console.log(`  typeof: ${results.webdriverType}`);
        console.log(`  "webdriver" in navigator: ${results.webdriverInNavigator}`);
        console.log(`  navigator.hasOwnProperty("webdriver"): ${results.navigatorHasOwn}`);
        console.log(`  Navigator.prototype.hasOwnProperty("webdriver"): ${results.prototypeHasOwn}`);
        console.log(`  Getter toString: ${results.getterToString.substring(0, 80)}...`);
        console.log(`  Plugins: ${results.plugins}`);
        console.log(`  Hardware Concurrency: ${results.hardwareConcurrency}`);

        // Get SannySoft test results
        const testResults = await page.evaluate(() => {
            const results = {};
            const rows = document.querySelectorAll('table tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const testName = cells[0]?.textContent?.trim();
                    const result = cells[1]?.textContent?.trim();
                    const isFailed = cells[1]?.className?.includes('failed');
                    if (testName && testName.toLowerCase().includes('webdriver')) {
                        results[testName] = { result, failed: isFailed };
                    }
                }
            });
            return results;
        });

        console.log('\n📋 SannySoft WebDriver Tests:');
        for (const [test, data] of Object.entries(testResults)) {
            const icon = data.failed ? '❌' : '✅';
            console.log(`  ${icon} ${test}: ${data.result}`);
        }

        await page.screenshot({ path: 'proxy_fix_sannysoft.png', fullPage: true });
        console.log('\n📸 Screenshot: proxy_fix_sannysoft.png');

        console.log('\n⏳ Browser open for 10s...');
        await page.waitForTimeout(10000);

    } finally {
        await browser.close();
        console.log('\n🛑 Done');
    }
}

testProxyWebdriverFix().catch(console.error);

