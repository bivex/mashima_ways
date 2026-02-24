#!/usr/bin/env node
/**
 * Copyright (c) 2025 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2025-12-28T15:19:53
 * Last Updated: 2025-12-28T15:19:53
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Test Patchright masking on SannySoft bot detector
 */

import { chromium } from 'patchright';

async function testPatchrightSannysoft() {
    console.log('🧪 Testing Patchright on SannySoft');
    console.log('='.repeat(60));
    console.log('');

    const browser = await chromium.launch({
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
        ],
    });

    try {
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
        });

        const page = await context.newPage();

        console.log('🌐 Navigating to bot.sannysoft.com...');
        await page.goto('https://bot.sannysoft.com/', {
            waitUntil: 'networkidle',
            timeout: 60000
        });

        // Wait for tests to complete
        await page.waitForTimeout(5000);

        // Get navigator properties
        const navigatorProps = await page.evaluate(() => {
            const getWebdriverDescriptor = () => {
                const desc = Object.getOwnPropertyDescriptor(navigator, 'webdriver');
                const protoDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver');
                return {
                    navigator: {
                        value: navigator.webdriver,
                        hasOwn: navigator.hasOwnProperty('webdriver'),
                        inOperator: 'webdriver' in navigator,
                        descriptor: desc ? { value: desc.value, get: typeof desc.get } : null,
                    },
                    prototype: {
                        hasOwn: Navigator.prototype.hasOwnProperty('webdriver'),
                        descriptor: protoDesc ? { value: protoDesc.value, get: typeof protoDesc.get } : null,
                    }
                };
            };

            return {
                webdriver: navigator.webdriver,
                webdriverDetailed: getWebdriverDescriptor(),
                plugins: navigator.plugins.length,
                pluginNames: Array.from(navigator.plugins).map(p => p.name),
                languages: navigator.languages,
                hardwareConcurrency: navigator.hardwareConcurrency,
                deviceMemory: navigator.deviceMemory,
                platform: navigator.platform,
                vendor: navigator.vendor,
                maxTouchPoints: navigator.maxTouchPoints,
                windowChrome: typeof window.chrome,
                chromeRuntime: typeof window.chrome?.runtime,
            };
        });

        console.log('\n📊 Navigator Properties (Patchright):');
        console.log('='.repeat(50));
        console.log(`  webdriver: ${navigatorProps.webdriver} ${navigatorProps.webdriver === false ? '✅ (false)' : navigatorProps.webdriver === undefined ? '✅ (undefined)' : '❌'}`);
        console.log(`  "webdriver" in navigator: ${navigatorProps.webdriverDetailed.navigator.inOperator}`);
        console.log(`  navigator.hasOwnProperty("webdriver"): ${navigatorProps.webdriverDetailed.navigator.hasOwn}`);
        console.log(`  Navigator.prototype.hasOwnProperty("webdriver"): ${navigatorProps.webdriverDetailed.prototype.hasOwn}`);
        console.log(`  plugins: ${navigatorProps.plugins}`);
        console.log(`  plugin names: ${navigatorProps.pluginNames.join(', ')}`);
        console.log(`  languages: ${JSON.stringify(navigatorProps.languages)}`);
        console.log(`  hardwareConcurrency: ${navigatorProps.hardwareConcurrency}`);
        console.log(`  deviceMemory: ${navigatorProps.deviceMemory}`);
        console.log(`  platform: ${navigatorProps.platform}`);
        console.log(`  vendor: ${navigatorProps.vendor}`);
        console.log(`  maxTouchPoints: ${navigatorProps.maxTouchPoints}`);
        console.log(`  window.chrome: ${navigatorProps.windowChrome}`);
        console.log(`  chrome.runtime: ${navigatorProps.chromeRuntime}`);

        // Get test results from page
        const testResults = await page.evaluate(() => {
            const results = [];
            const rows = document.querySelectorAll('table tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const testName = cells[0]?.textContent?.trim();
                    const result = cells[1]?.textContent?.trim();
                    const status = cells[1]?.className?.includes('failed') ? 'FAIL' :
                                   cells[1]?.className?.includes('passed') ? 'PASS' :
                                   cells[1]?.className?.includes('warn') ? 'WARN' : 'UNKNOWN';
                    if (testName) {
                        results.push({ test: testName, result, status });
                    }
                }
            });
            return results;
        });

        console.log('\n📋 SannySoft Test Results:');
        console.log('='.repeat(50));
        
        let passCount = 0, failCount = 0, warnCount = 0;
        
        testResults.forEach(r => {
            let icon = '⚪';
            if (r.status === 'PASS') { icon = '✅'; passCount++; }
            else if (r.status === 'FAIL') { icon = '❌'; failCount++; }
            else if (r.status === 'WARN') { icon = '⚠️'; warnCount++; }
            
            console.log(`${icon} ${r.test}: ${r.result}`);
        });

        console.log('\n📊 Summary:');
        console.log(`  ✅ Passed: ${passCount}`);
        console.log(`  ❌ Failed: ${failCount}`);
        console.log(`  ⚠️ Warnings: ${warnCount}`);

        // Take screenshot
        await page.screenshot({ path: 'patchright_sannysoft.png', fullPage: true });
        console.log('\n📸 Screenshot saved: patchright_sannysoft.png');

        console.log('\n⏳ Keeping browser open for 15 seconds...');
        await page.waitForTimeout(15000);

    } finally {
        await browser.close();
        console.log('\n🛑 Browser closed');
    }
}

testPatchrightSannysoft().catch(console.error);

