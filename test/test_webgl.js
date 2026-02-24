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
 * Test WebGL masking - Hide SwiftShader/ANGLE detection
 */

import { chromium } from 'patchright';
import { StealthManager } from '../src/domain/services/StealthManager.js';

async function testWebGL() {
    console.log('🧪 Testing WebGL Masking (Hide SwiftShader)');
    console.log('='.repeat(60));

    const stealth = new StealthManager();

    const browser = await chromium.launch({
        headless: false,
        args: stealth.getLaunchArgs(),
        ignoreDefaultArgs: stealth.getIgnoredDefaultArgs(),
    });

    try {
        const context = await browser.newContext(stealth.getContextOptions());
        await stealth.applyToContext(context);
        
        const page = await context.newPage();

        // Check WebGL info
        const webglInfo = await page.evaluate(() => {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) return { error: 'WebGL not supported' };
            
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            
            return {
                vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'N/A',
                renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'N/A',
                version: gl.getParameter(gl.VERSION),
                shadingLanguage: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            };
        });

        console.log('\n📊 WebGL Info:');
        console.log('='.repeat(50));
        console.log(`  Vendor: ${webglInfo.vendor}`);
        console.log(`  Renderer: ${webglInfo.renderer}`);
        console.log(`  Version: ${webglInfo.version}`);
        console.log(`  Shading: ${webglInfo.shadingLanguage}`);

        // Check for SwiftShader detection
        const isSwiftShader = webglInfo.renderer?.includes('SwiftShader') || 
                             webglInfo.renderer?.includes('llvmpipe') ||
                             webglInfo.renderer?.includes('0x0000C0DE');
        
        console.log('\n🔍 Detection Check:');
        console.log(`  SwiftShader detected: ${isSwiftShader ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);

        // Navigate to test site
        console.log('\n🌐 Checking on bot.sannysoft.com...');
        await page.goto('https://bot.sannysoft.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });

        await page.waitForTimeout(3000);

        // Get WebGL from test site
        const siteWebGL = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tr');
            const result = {};
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const name = cells[0]?.textContent?.trim();
                    const value = cells[1]?.textContent?.trim();
                    if (name?.includes('WebGL')) {
                        result[name] = value;
                    }
                }
            });
            return result;
        });

        console.log('\n📋 SannySoft WebGL Results:');
        Object.entries(siteWebGL).forEach(([key, value]) => {
            const hasSwift = value?.includes('SwiftShader') || value?.includes('0x0000C0DE');
            console.log(`  ${hasSwift ? '❌' : '✅'} ${key}: ${value}`);
        });

        console.log('\n⏳ Browser open for 5s...');
        await page.waitForTimeout(5000);

    } finally {
        await browser.close();
        console.log('\n🛑 Done');
    }
}

testWebGL().catch(console.error);

