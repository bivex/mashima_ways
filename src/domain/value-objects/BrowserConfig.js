/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-24 23:49
 * Last Updated: 2026-02-24 23:49
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

import {userAgentManager} from '../services/UserAgentManager.js';

export class BrowserConfig {
    constructor({
                    headless = true,
                    args = [],
                    timeout = 30000,
                    viewport = null,
                    javaScriptEnabled = true,
                    blockResources = [],
                    userAgent = null
                }) {
        this.headless = headless;
        this.args = Array.isArray(args) ? [...args] : [];
        this.timeout = timeout;
        this.viewport = viewport;
        this.javaScriptEnabled = javaScriptEnabled;
        this.blockResources = Array.isArray(blockResources) ? [...blockResources] : [];
        this.userAgent = userAgent;
    }

    static default() {
        return new BrowserConfig({
            headless: true,
            args: [
                // Critical for servers
                '--disable-gpu',
                '--disable-dev-shm-usage',      // Required for Docker/low shm
                '--no-sandbox',                  // Only in isolated environments
                '--disable-setuid-sandbox',

                // Memory optimization
                '--disable-extensions',
                '--disable-plugins',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--memory-pressure-off',

                // Disable unnecessary rendering
                '--disable-gl-drawing-for-tests',
                '--disable-software-rasterizer',

                // Disable features
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection',
                '--disable-default-apps',
                '--no-first-run',

                // Smaller viewport = less memory
                '--window-size=800,600'
            ],
            timeout: 30000,
            viewport: {width: 800, height: 600}, // Minimal viewport for memory savings
            javaScriptEnabled: true,
            blockResources: ['image', 'media', 'font'],
            userAgent: userAgentManager.getPopularDesktop()
        });
    }

    withSandboxDisabled() {
        return new BrowserConfig({
            ...this,
            args: [...this.args, '--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    /**
     * Создать конфиг с новым ротируемым userAgent
     */
    withRotatedUserAgent() {
        return new BrowserConfig({
            ...this,
            userAgent: userAgentManager.getRealistic()
        });
    }

    /**
     * Создать конфиг с мобильным userAgent
     */
    withMobileUserAgent() {
        return new BrowserConfig({
            ...this,
            userAgent: userAgentManager.getPopularMobile(),
            viewport: {width: 375, height: 667} // iPhone SE viewport
        });
    }

    /**
     * Создать конфиг с безопасным userAgent
     */
    withSafeUserAgent(platform = 'desktop', os = 'windows', browser = 'chrome') {
        return new BrowserConfig({
            ...this,
            userAgent: userAgentManager.getSafe(platform, os, browser)
        });
    }

    /**
     * Extreme memory optimization mode (from high-performance manual)
     * WARNING: May reduce stability with complex pages
     * Use only when memory is critical constraint
     */
    withExtremeMemoryOptimization() {
        return new BrowserConfig({
            ...this,
            args: [
                ...this.args,
                '--single-process',        // Single process instead of multi-process architecture
                '--no-zygote',
                '--disk-cache-size=1',     // Minimal disk cache
                '--aggressive-cache-discard'
            ]
        });
    }

    /**
     * Optimized for scraping static pages (from manual best practices)
     * Disables JavaScript for massive performance boost
     */
    static forStaticScraping() {
        const config = BrowserConfig.default();
        return new BrowserConfig({
            ...config,
            javaScriptEnabled: false,  // Huge performance improvement for static pages
        });
    }

    /**
     * § 5.3 Single Browser Architecture - Максимальная скорость на одной машине
     * Оптимизированная конфигурация для ОДНОГО браузера с множеством контекстов
     *
     * Из playwright_context_architecture.md:
     * - ОДИН Browser instance
     * - N = CPU_CORES × 4 контекстов
     * - Агрессивная оптимизация памяти
     * - Блокировка ресурсов на уровне контекста
     */
    static forSingleBrowserArchitecture() {
        return new BrowserConfig({
            headless: true,
            args: [
                // § 5.3: Критические флаги для single browser
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',

                // § 5.3: Агрессивная оптимизация памяти
                '--disable-extensions',
                '--disable-background-networking',
                '--disable-default-apps',
                '--disable-sync',

                // § 5.3: Меньше процессов = меньше overhead
                '--disable-breakpad',
                '--disable-component-extensions-with-background-pages',

                // § 5.3: Ускорение рендеринга
                '--disable-features=TranslateUI,BlinkGenPropertyTrees',

                // Дополнительная оптимизация
                '--disable-plugins',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--memory-pressure-off',
                '--disable-software-rasterizer',
                '--disable-ipc-flooding-protection',
                '--no-first-run',

                // Минимальный viewport
                '--window-size=800,600'
            ],
            timeout: 30000,
            viewport: {width: 800, height: 600},
            javaScriptEnabled: true,
            blockResources: ['image', 'media', 'font', 'stylesheet'], // § 7.1: Блокировка на 60-70%
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
    }
}