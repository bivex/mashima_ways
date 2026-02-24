#!/usr/bin/env node
/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-24 23:44
 * Last Updated: 2026-02-24 23:44
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Open Google as California user
 */

import { chromium } from 'patchright';
import { StealthManager } from '../src/domain/services/StealthManager.js';

async function openGoogleCalifornia() {
    console.log('🌴 Opening Google as California user...\n');

    const stealth = new StealthManager();

    const browser = await chromium.launch({
        headless: false,
        args: stealth.getLaunchArgs(),
    });

    // Create California context (Los Angeles)
    const context = await browser.newContext(
        stealth.getCaliforniaContextOptions('losAngeles')
    );
    await stealth.applyToContext(context);

    const page = await context.newPage();
    await stealth.applyToPage(page);

    // Check settings
    const info = await page.evaluate(() => ({
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language,
        webdriver: navigator.webdriver,
        deviceMemory: navigator.deviceMemory,
    }));

    console.log('📍 Browser Settings:');
    console.log('   Timezone:', info.timezone);
    console.log('   Locale:', info.locale);
    console.log('   Webdriver:', info.webdriver, info.webdriver === false ? '✅' : '❌');
    console.log('   Device Memory:', info.deviceMemory, 'GB');
    console.log('');

    // Clear cookies to remove previous language preferences
    await context.clearCookies();
    await page.goto('https://www.google.com/ncr'); // ncr = no country redirect

    // Alternative: force language with URL params
    // await page.goto('https://www.google.com/search?hl=en&gl=US&pws=0');

    // Check if blocked
    const url = page.url();
    if (url.includes('sorry') || url.includes('consent')) {
        console.log('⚠️  Redirect detected:', url.substring(0, 80));
    } else {
        console.log('✅ Google loaded successfully!');
    }

    console.log('\n🖥️  Browser is open. Press Ctrl+C to close.\n');

    // Keep browser open
    await new Promise(() => {});
}

openGoogleCalifornia().catch(console.error);

