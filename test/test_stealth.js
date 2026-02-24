#!/usr/bin/env node
/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-24 23:50
 * Last Updated: 2026-02-24 23:50
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Test StealthManager - 20 Anti-Detection Techniques
 */

import { chromium } from 'patchright';
import { StealthManager } from '../src/domain/services/StealthManager.js';

async function testStealth() {
    console.log('🧪 Testing StealthManager - 20 Anti-Detection Techniques');
    console.log('='.repeat(60));
    console.log('');

    const stealth = new StealthManager();
    
    console.log('📋 Techniques to apply:');
    stealth.techniques.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t}`);
    });
    console.log('');

    // Launch browser with stealth args
    const browser = await chromium.launch({
        headless: false,
        args: stealth.getLaunchArgs(),
        ignoreDefaultArgs: stealth.getIgnoredDefaultArgs(),
    });

    try {
        // Create context with stealth options
        const context = await browser.newContext(stealth.getContextOptions());
        
        // Apply all 20 stealth techniques
        await stealth.applyToContext(context);
        
        const page = await context.newPage();

        // Navigate to bot detector
        console.log('🌐 Navigating to bot.sannysoft.com...');
        await page.goto('https://bot.sannysoft.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });

        await page.waitForTimeout(3000);

        // Check navigator properties
        const props = await page.evaluate(() => {
            return {
                webdriver: navigator.webdriver,
                webdriverIn: 'webdriver' in navigator,
                plugins: navigator.plugins.length,
                languages: navigator.languages,
                hardwareConcurrency: navigator.hardwareConcurrency,
                deviceMemory: navigator.deviceMemory,
                maxTouchPoints: navigator.maxTouchPoints,
                vendor: navigator.vendor,
                chrome: typeof window.chrome,
            };
        });

        console.log('\n📊 Navigator Properties:');
        console.log('='.repeat(50));
        console.log(`  webdriver: ${props.webdriver} ${props.webdriver === false ? '✅' : '❌'}`);
        console.log(`  "webdriver" in navigator: ${props.webdriverIn}`);
        console.log(`  plugins: ${props.plugins} ${props.plugins >= 3 ? '✅' : '⚠️'}`);
        console.log(`  languages: ${JSON.stringify(props.languages)}`);
        console.log(`  hardwareConcurrency: ${props.hardwareConcurrency} ${props.hardwareConcurrency >= 4 ? '✅' : '⚠️'}`);
        console.log(`  deviceMemory: ${props.deviceMemory} ${props.deviceMemory >= 4 ? '✅' : '⚠️'}`);
        console.log(`  maxTouchPoints: ${props.maxTouchPoints}`);
        console.log(`  vendor: ${props.vendor}`);
        console.log(`  window.chrome: ${props.chrome} ${props.chrome === 'object' ? '✅' : '⚠️'}`);

        // Get test results from SannySoft
        const testResults = await page.evaluate(() => {
            const results = { passed: 0, failed: 0, tests: [] };
            const rows = document.querySelectorAll('table tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const testName = cells[0]?.textContent?.trim();
                    const result = cells[1]?.textContent?.trim();
                    const failed = cells[1]?.className?.includes('failed');
                    if (testName) {
                        results.tests.push({ test: testName, result, failed });
                        if (failed) results.failed++;
                        else results.passed++;
                    }
                }
            });
            return results;
        });

        console.log('\n📋 SannySoft Test Results:');
        console.log('='.repeat(50));
        testResults.tests.slice(0, 15).forEach(t => {
            const icon = t.failed ? '❌' : '✅';
            console.log(`  ${icon} ${t.test}: ${t.result}`);
        });
        
        if (testResults.tests.length > 15) {
            console.log(`  ... and ${testResults.tests.length - 15} more tests`);
        }

        console.log('\n📊 Summary:');
        console.log(`  ✅ Passed: ${testResults.passed}`);
        console.log(`  ❌ Failed: ${testResults.failed}`);
        console.log(`  📈 Score: ${Math.round(testResults.passed / (testResults.passed + testResults.failed) * 100)}%`);

        // Screenshot
        await page.screenshot({ path: 'stealth_test_result.png', fullPage: true });
        console.log('\n📸 Screenshot: stealth_test_result.png');

        console.log('\n⏳ Browser open for 10s...');
        await page.waitForTimeout(10000);

    } finally {
        await browser.close();
        console.log('\n🛑 Done');
    }
}

testStealth().catch(console.error);

