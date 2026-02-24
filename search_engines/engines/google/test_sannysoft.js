#!/usr/bin/env node
/**
 * Copyright (c) 2025 Bivex
 *
 * Test browser fingerprint masking on SannySoft
 * https://bot.sannysoft.com/ - Shows which detection tests pass/fail
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

chromium.use(StealthPlugin());

async function testSannysoft() {
    console.log('🧪 Testing Browser Fingerprint on SannySoft');
    console.log('='.repeat(60));
    console.log('');

    const browser = await chromium.launch({
        headless: false,  // Use headed mode for better results
        channel: 'chrome',  // Use real Chrome
        args: [
            // CRITICAL: This flag prevents navigator.webdriver from being set to true
            '--disable-blink-features=AutomationControlled',
            
            // Remove automation flags
            '--disable-infobars',
            '--disable-extensions',
            '--no-first-run',
            '--no-default-browser-check',
            
            // Performance
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            
            // WebGL
            '--enable-webgl',
            '--use-gl=swiftshader',
        ],
        ignoreDefaultArgs: ['--enable-automation'],  // Remove automation banner
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
    });

    // Add stealth injections
    await context.addInitScript(() => {
        // 1. webdriver - should be undefined with --disable-blink-features=AutomationControlled
        // But add backup just in case
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
            configurable: true,
        });

        // 2. Chrome object
        window.chrome = {
            runtime: {},
            csi: () => ({ startE: Date.now(), onloadT: Date.now(), pageT: 100, tran: 15 }),
            loadTimes: () => ({ 
                requestTime: Date.now() / 1000,
                startLoadTime: Date.now() / 1000,
                commitLoadTime: Date.now() / 1000 + 0.1,
                finishDocumentLoadTime: Date.now() / 1000 + 0.3,
                finishLoadTime: Date.now() / 1000 + 0.5,
            }),
            app: { isInstalled: false },
        };

        // 3. Plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => {
                const plugins = [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1 },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '', length: 1 },
                    { name: 'Native Client', filename: 'internal-nacl-plugin', description: '', length: 1 },
                ];
                plugins.length = 3;
                plugins.item = (i) => plugins[i] || null;
                plugins.namedItem = (name) => plugins.find(p => p.name === name) || null;
                plugins.refresh = () => {};
                return plugins;
            },
        });

        // 4. Languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });

        // 5. Hardware
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => 8,
        });
        Object.defineProperty(navigator, 'deviceMemory', {
            get: () => 8,
        });

        // 6. Permissions
        const originalQuery = navigator.permissions.query;
        navigator.permissions.query = (parameters) => {
            if (parameters.name === 'notifications') {
                return Promise.resolve({ state: Notification.permission, onchange: null });
            }
            return originalQuery.call(navigator.permissions, parameters);
        };
    });

    const page = await context.newPage();

    try {
        console.log('🌐 Navigating to bot.sannysoft.com...');
        await page.goto('https://bot.sannysoft.com/', {
            waitUntil: 'networkidle',
            timeout: 60000
        });

        // Wait for tests to complete
        await page.waitForTimeout(5000);

        // Take screenshot
        await page.screenshot({ path: 'sannysoft_test.png', fullPage: true });
        console.log('📸 Screenshot saved to: sannysoft_test.png');

        // Extract test results
        const results = await page.evaluate(() => {
            const tests = {};
            const rows = document.querySelectorAll('table tr');
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const testName = cells[0].textContent.trim();
                    const resultCell = cells[1];
                    const passed = resultCell.classList.contains('passed') || 
                                   resultCell.style.backgroundColor === 'rgb(144, 238, 144)' ||
                                   resultCell.style.backgroundColor === 'lightgreen';
                    const failed = resultCell.classList.contains('failed') || 
                                   resultCell.style.backgroundColor === 'rgb(255, 182, 193)' ||
                                   resultCell.style.backgroundColor === 'lightcoral';
                    const value = resultCell.textContent.trim();
                    
                    if (testName) {
                        tests[testName] = {
                            passed: passed,
                            failed: failed,
                            value: value
                        };
                    }
                }
            });
            
            return tests;
        });

        // Display results
        console.log('\n📊 TEST RESULTS:');
        console.log('─'.repeat(60));
        
        let passedCount = 0;
        let failedCount = 0;
        
        for (const [test, result] of Object.entries(results)) {
            const status = result.passed ? '✅' : (result.failed ? '❌' : '⚪');
            if (result.passed) passedCount++;
            if (result.failed) failedCount++;
            console.log(`${status} ${test}: ${result.value}`);
        }
        
        console.log('─'.repeat(60));
        console.log(`📈 Summary: ${passedCount} passed, ${failedCount} failed`);

        // Check specific important tests
        console.log('\n🔍 KEY DETECTION TESTS:');
        const keyTests = ['WebDriver', 'WebDriver advanced', 'Chrome', 'Permissions', 'Plugins Length', 'Languages'];
        for (const testName of keyTests) {
            const result = results[testName];
            if (result) {
                const status = result.passed ? '✅ PASS' : '❌ FAIL';
                console.log(`   ${testName}: ${status} (${result.value})`);
            }
        }

        console.log('\n⏸️  Browser will stay open for 30 seconds for inspection...');
        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
        console.log('\n✅ Browser closed');
    }
}

testSannysoft().catch(console.error);

