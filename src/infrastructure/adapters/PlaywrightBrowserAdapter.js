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

import {chromium} from 'patchright';
import { StealthManager } from '../../domain/services/StealthManager.js';

export class PlaywrightBrowserAdapter {
    constructor(browserPoolManager = null) {
        this.browsers = new Map(); // browserId -> { browser, contexts: Map<contextId, context> }
        this.browserPoolManager = browserPoolManager; // For watchdog functionality
        this.isShuttingDown = false; // Flag to disable watchdog during shutdown
        this.stealthManager = new StealthManager(); // 20 anti-detection techniques
    }

    setShuttingDown(shuttingDown) {
        this.isShuttingDown = shuttingDown;
    }

    async launchBrowser(browserId, config) {
        try {
            // Merge config args with stealth args if stealth mode enabled
            let launchArgs = config.args || [];
            if (config.stealth !== false) {
                launchArgs = [...new Set([...launchArgs, ...this.stealthManager.getLaunchArgs()])];
            }

            const launchOptions = {
                headless: config.headless,
                args: launchArgs,
            };

            // Add ignored default args for stealth
            if (config.stealth !== false) {
                launchOptions.ignoreDefaultArgs = this.stealthManager.getIgnoredDefaultArgs();
            }

            const browser = await chromium.launch(launchOptions);

            this.browsers.set(browserId, {
                browser,
                contexts: new Map(),
                config
            });

            // Set up disconnect handler for crash detection and auto-restart
            browser.on('disconnected', async () => {
                // Skip watchdog during graceful shutdown
                if (this.isShuttingDown) {
                    console.debug(`Browser ${browserId} disconnected during shutdown - skipping watchdog`);
                    return;
                }

                console.warn(`Browser ${browserId} disconnected unexpectedly - initiating watchdog restart`);

                // Mark browser as crashed in our tracking
                const browserData = this.browsers.get(browserId);
                if (browserData) {
                    browserData.crashed = true;
                }

                // Auto-restart browser if pool manager is available
                if (this.browserPoolManager) {
                    try {
                        console.log(`🔄 Watchdog: restarting browser ${browserId}...`);
                        await this.browserPoolManager.restartBrowser(browserId);
                        console.log(`✅ Watchdog: browser ${browserId} restarted successfully`);
                    } catch (restartError) {
                        console.error(`❌ Watchdog: failed to restart browser ${browserId}:`, restartError.message);
                    }
                }
            });

        } catch (error) {
            console.error(`Failed to launch browser ${browserId}:`, error);
            throw error;
        }
    }

    async createContext(browserId, contextId, options = {}) {
        const browserData = this.browsers.get(browserId);
        if (!browserData) {
            throw new Error(`Browser ${browserId} not found`);
        }

        const stealth = options.stealth !== false && browserData.config.stealth !== false;

        // Get base context options (with stealth settings if enabled)
        let contextOptions;
        if (stealth) {
            contextOptions = this.stealthManager.getContextOptions({
                javaScriptEnabled: browserData.config.javaScriptEnabled,
                serviceWorkers: 'block',
                acceptDownloads: false,
                bypassCSP: true,
                ignoreHTTPSErrors: true,
            });
        } else {
            contextOptions = {
                javaScriptEnabled: browserData.config.javaScriptEnabled,
                viewport: browserData.config.viewport || {width: 800, height: 600},
                serviceWorkers: 'block',
                acceptDownloads: false,
                bypassCSP: true,
                ignoreHTTPSErrors: true,
            };
        }

        // Override with custom userAgent if specified
        if (browserData.config.userAgent) {
            contextOptions.userAgent = browserData.config.userAgent;
        }

        const context = await browserData.browser.newContext(contextOptions);

        // Apply 20 stealth techniques if enabled
        if (stealth) {
            await this.stealthManager.applyToContext(context);
        }

        // Set up resource blocking (saves 70% traffic and time)
        if (options.resourceBlocking !== false) {
            await this._setupResourceBlocking(context);
        }

        browserData.contexts.set(contextId, context);
        return context;
    }

    /**
     * Создать контекст с кастомной конфигурацией
     */
    async createContextWithConfig(browserId, contextId, contextConfig) {
        const browserData = this.browsers.get(browserId);
        if (!browserData) {
            throw new Error(`Browser ${browserId} not found`);
        }

        const stealth = contextConfig.stealth !== false && browserData.config.stealth !== false;

        // Get base context options (with stealth settings if enabled)
        let contextOptions;
        if (stealth) {
            contextOptions = this.stealthManager.getContextOptions({
                javaScriptEnabled: contextConfig.javaScriptEnabled !== undefined ? contextConfig.javaScriptEnabled : browserData.config.javaScriptEnabled,
                viewport: contextConfig.viewport || browserData.config.viewport,
                serviceWorkers: contextConfig.serviceWorkers || 'block',
                acceptDownloads: contextConfig.acceptDownloads || false,
                bypassCSP: contextConfig.bypassCSP !== false,
                ignoreHTTPSErrors: contextConfig.ignoreHTTPSErrors !== false,
            });
        } else {
            contextOptions = {
                javaScriptEnabled: contextConfig.javaScriptEnabled !== undefined ? contextConfig.javaScriptEnabled : browserData.config.javaScriptEnabled,
                viewport: contextConfig.viewport || browserData.config.viewport || {width: 800, height: 600},
                serviceWorkers: contextConfig.serviceWorkers || 'block',
                acceptDownloads: contextConfig.acceptDownloads || false,
                bypassCSP: contextConfig.bypassCSP !== false,
                ignoreHTTPSErrors: contextConfig.ignoreHTTPSErrors !== false,
            };
        }

        // Add userAgent from contextConfig or browser config
        if (contextConfig.userAgent) {
            contextOptions.userAgent = contextConfig.userAgent;
        } else if (browserData.config.userAgent && !stealth) {
            contextOptions.userAgent = browserData.config.userAgent;
        }

        const context = await browserData.browser.newContext(contextOptions);

        // Apply 20 stealth techniques if enabled
        if (stealth) {
            await this.stealthManager.applyToContext(context);
        }

        // Set up resource blocking (unless explicitly disabled)
        if (contextConfig.resourceBlocking !== false) {
            await this._setupResourceBlocking(context);
        }

        browserData.contexts.set(contextId, context);
        return context;
    }

    async createPage(browserId, contextId, options = {}) {
        const browserData = this.browsers.get(browserId);
        if (!browserData) {
            throw new Error(`Browser ${browserId} not found`);
        }

        const context = browserData.contexts.get(contextId);
        if (!context) {
            throw new Error(`Context ${contextId} not found in browser ${browserId}`);
        }

        const page = await context.newPage();

        // Apply page-level stealth (for properties that need evaluate)
        const stealth = options.stealth !== false && browserData.config.stealth !== false;
        if (stealth) {
            await this.stealthManager.applyToPage(page);
        }

        return page;
    }

    async closeContext(browserId, contextId) {
        const browserData = this.browsers.get(browserId);
        if (!browserData) {
            throw new Error(`Browser ${browserId} not found`);
        }

        const context = browserData.contexts.get(contextId);
        if (context) {
            await context.close();
            browserData.contexts.delete(contextId);
        } else {
            // Context already closed or doesn't exist - this is normal during cleanup
            console.debug(`Context ${contextId} not found in browser ${browserId} - already cleaned up`);
        }
    }

    async closeBrowser(browserId) {
        const browserData = this.browsers.get(browserId);
        if (browserData) {
            // Close all contexts first
            for (const [contextId, context] of browserData.contexts) {
                try {
                    await context.close();
                } catch (error) {
                    console.warn(`Error closing context ${contextId}:`, error);
                }
            }

            await browserData.browser.close();
            this.browsers.delete(browserId);
        }
    }

    async closeAll() {
        const closePromises = [];
        for (const browserId of this.browsers.keys()) {
            closePromises.push(this.closeBrowser(browserId));
        }
        await Promise.all(closePromises);
    }

    getBrowser(browserId) {
        const browserData = this.browsers.get(browserId);
        return browserData ? browserData.browser : null;
    }

    getContext(browserId, contextId) {
        const browserData = this.browsers.get(browserId);
        if (!browserData) return null;
        return browserData.contexts.get(contextId) || null;
    }

    isBrowserRunning(browserId) {
        const browserData = this.browsers.get(browserId);
        return browserData && browserData.browser.isConnected() && !browserData.crashed;
    }

    hasBrowserCrashed(browserId) {
        const browserData = this.browsers.get(browserId);
        return browserData && browserData.crashed;
    }

    /**
     * Get StealthManager instance for advanced usage
     */
    getStealthManager() {
        return this.stealthManager;
    }

    /**
     * Human-like delay
     */
    async humanDelay(min = 500, max = 2000) {
        return this.stealthManager.humanDelay(min, max);
    }

    /**
     * Human-like mouse movement on page
     */
    async humanMouseMove(page) {
        return this.stealthManager.humanMouseMove(page);
    }

    /**
     * Setup AGGRESSIVE resource blocking on context level (applies to all pages)
     * Saves up to 80% traffic and rendering time by blocking images, CSS, fonts, analytics, and more
     * Best practice from high-performance Playwright manual
     */
    async _setupResourceBlocking(context) {
        // Block images - typically 69% of requests
        await context.route('**/*.{png,jpg,jpeg,gif,svg,webp,ico,avif,bmp}', route => route.abort());

        // Block stylesheets and fonts - typically 18% of requests
        await context.route('**/*.{css,woff,woff2,ttf,eot,otf}', route => route.abort());

        // Block media files
        await context.route('**/*.{mp4,webm,ogg,mp3,wav,flac,aac,m4a}', route => route.abort());

        // ⚡ AGGRESSIVE: Additional blocking for idle reduction
        await context.route('**/*', route => {
            const url = route.request().url();
            const type = route.request().resourceType();

            // Block websocket (often causes idle waiting)
            if (type === 'websocket') {
                return route.abort();
            }

            // Block additional resource types
            if (['manifest', 'other'].includes(type)) {
                // Check if it's not critical JSON/data
                if (!url.includes('.json') && !url.includes('api')) {
                    return route.abort();
                }
            }

            // Block common analytics and tracking domains
            const blockPatterns = [
                'google-analytics.com',
                'googletagmanager.com',
                'facebook.com/tr',
                'doubleclick.net',
                'analytics.',
                'tracking.',
                'metrics.',
                'cdn.segment.com',
                'hotjar.com',
                'mixpanel.com',
                'amplitude.com',
                'gtm.',
                'recaptcha',
                'hcaptcha.com',
                'challenges.cloudflare.com',
                'bat.bing.com',
                'pixel.wp.com',
                'stats.wp.com',
                'pixel.facebook.com',
                'sb.scorecardresearch.com',
                'secure.quantserve.com',
                'pixel.quantserve.com',
                'ad.doubleclick.net',
                'tpc.googlesyndication.com',
                'pagead2.googlesyndication.com',
                'static.cloudflareinsights.com',
                'clarity.ms',
                'analytics.twitter.com',
                'connect.facebook.net',
                'platform.twitter.com',
                'cdn.syndication.twimg.com'
            ];

            for (const pattern of blockPatterns) {
                if (url.includes(pattern)) {
                    return route.abort();
                }
            }

            // Block specific file extensions that cause delays
            const blockExtensions = [
                '.pdf', '.zip', '.exe', '.dmg', '.pkg', '.deb', '.rpm',
                '.iso', '.img', '.bin', '.tar', '.gz', '.rar', '.7z'
            ];

            for (const ext of blockExtensions) {
                if (url.toLowerCase().endsWith(ext)) {
                    return route.abort();
                }
            }

            // Block common unnecessary paths
            const blockPaths = [
                '/wp-content/', '/wp-includes/', '/uploads/',
                '/static/', '/assets/css/', '/assets/js/',
                '/node_modules/', '/dist/', '/build/',
                '/_next/static/', '/.well-known/'
            ];

            for (const path of blockPaths) {
                if (url.includes(path)) {
                    // Allow critical JSON/API calls even in these paths
                    if (!url.includes('.json') && !url.includes('api')) {
                        return route.abort();
                    }
                }
            }

            return route.continue();
        });
    }
}