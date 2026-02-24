#!/usr/bin/env node
/**
 * Copyright (c) 2025 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2025-12-28T15:45:00
 * Last Updated: 2025-12-28T16:01:06
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * StealthManager - 20 Anti-Detection Evasion Techniques
 * 
 * Comprehensive browser fingerprint masking for undetectable automation
 */

export class StealthManager {
    constructor(options = {}) {
        this.options = {
            level: 'full',  // 'minimal', 'standard', 'full'
            ...options
        };
        
        // All 20 evasion techniques
        this.techniques = [
            'webdriver',           // 1. Navigator.webdriver masking
            'plugins',             // 2. Navigator.plugins spoofing
            'languages',           // 3. Navigator.languages
            'hardwareConcurrency', // 4. CPU cores
            'deviceMemory',        // 5. RAM
            'maxTouchPoints',      // 6. Touch screen
            'platform',            // 7. Platform info
            'vendor',              // 8. Browser vendor
            'webgl',               // 9. WebGL fingerprint
            'canvas',              // 10. Canvas fingerprint
            'audioContext',        // 11. Audio fingerprint
            'permissions',         // 12. Permissions API
            'chromeRuntime',       // 13. Chrome object
            'iframeContentWindow', // 14. Iframe detection
            'outerDimensions',     // 15. Window dimensions
            'connectionRtt',       // 16. Network info
            'mediaDevices',        // 17. Media devices
            'batteryAPI',          // 18. Battery status
            'functionToString',    // 19. Function.prototype.toString
            'stackTraces',         // 20. Error stack traces
        ];
    }

    /**
     * Get browser launch arguments for stealth
     */
    getLaunchArgs() {
        return [
            // Critical anti-detection
            '--disable-blink-features=AutomationControlled',
            
            // Remove automation indicators
            '--disable-infobars',
            '--disable-extensions',
            '--no-first-run',
            '--no-default-browser-check',
            
            // Performance & stability
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            
            // WebGL & rendering - USE REAL GPU (not SwiftShader!)
            '--enable-webgl',
            '--enable-webgl2',
            '--enable-accelerated-2d-canvas',
            '--enable-gpu-rasterization',
            // Don't use SwiftShader - it's detectable
            // '--use-gl=swiftshader',  // REMOVED - detectable!
            
            // Disable automation flags
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-component-extensions-with-background-pages',
            '--disable-component-update',
            '--disable-default-apps',
            '--disable-hang-monitor',
            '--disable-ipc-flooding-protection',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-renderer-backgrounding',
            '--disable-sync',
            '--metrics-recording-only',
            '--no-pings',
            '--password-store=basic',
            '--use-mock-keychain',
        ];
    }

    /**
     * Get ignored default args
     */
    getIgnoredDefaultArgs() {
        return ['--enable-automation'];
    }

    /**
     * Apply all stealth techniques to browser context
     * @param {BrowserContext} context - Playwright browser context
     */
    async applyToContext(context) {
        console.log(`🎭 Applying ${this.techniques.length} stealth techniques...`);
        
        // 1. Webdriver masking (Proxy method - most reliable)
        await this._applyWebdriverMasking(context);
        
        // 2-8. Navigator properties
        await this._applyNavigatorMasking(context);
        
        // 9-11. Fingerprint masking (WebGL, Canvas, Audio)
        await this._applyFingerprintMasking(context);
        
        // 12-14. Browser API masking
        await this._applyBrowserAPIMasking(context);
        
        // 15-18. Environment masking
        await this._applyEnvironmentMasking(context);
        
        // 19-20. Advanced detection bypass
        await this._applyAdvancedMasking(context);
        
        console.log(`✅ All ${this.techniques.length} stealth techniques applied`);
    }

    /**
     * 1. Navigator.webdriver masking (Proxy method from GitHub #527)
     */
    async _applyWebdriverMasking(context) {
        await context.addInitScript(() => {
            // Proxy-based solution - most reliable
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
                        return false;
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
    }

    /**
     * 2-8. Navigator properties masking
     */
    async _applyNavigatorMasking(context) {
        await context.addInitScript(() => {
            // 2. Plugins - Real PluginArray
            const pluginsData = [
                { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            ];
            
            // Only override if plugins array is empty (automation browser)
            if (navigator.plugins.length === 0) {
                const fakePlugins = {
                    length: pluginsData.length,
                    item: (i) => fakePlugins[i] || null,
                    namedItem: (name) => pluginsData.find(p => p.name === name) || null,
                    refresh: () => {},
                    [Symbol.iterator]: function* () {
                        for (let i = 0; i < pluginsData.length; i++) yield fakePlugins[i];
                    }
                };
                pluginsData.forEach((p, i) => { fakePlugins[i] = p; });
                
                Object.defineProperty(navigator, 'plugins', {
                    get: () => fakePlugins,
                    configurable: true,
                    enumerable: true,
                });
            }

            // 3. Languages
            if (!navigator.languages || navigator.languages.length === 0) {
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en'],
                    configurable: true,
                });
            }

            // 4. Hardware Concurrency (realistic range: 4-16)
            const realCores = navigator.hardwareConcurrency;
            if (realCores < 4) {
                Object.defineProperty(navigator, 'hardwareConcurrency', {
                    get: () => 8,
                    configurable: true,
                });
            }

            // 5. Device Memory (realistic range: 4-16 GB)
            // Patchright doesn't have deviceMemory - add it from scratch
            if (!('deviceMemory' in navigator)) {
                Object.defineProperty(Navigator.prototype, 'deviceMemory', {
                    get: function() { return 8; },
                    configurable: true,
                    enumerable: true,
                });
            }

            // 5b. performance.memory for CHR_MEMORY test
            if (window.performance && !window.performance.memory) {
                Object.defineProperty(window.performance, 'memory', {
                    get: () => ({
                        jsHeapSizeLimit: 4294705152,
                        totalJSHeapSize: 35839908,
                        usedJSHeapSize: 33207892,
                    }),
                    configurable: true,
                    enumerable: true,
                });
            }

            // 6. Max Touch Points (0 for desktop)
            Object.defineProperty(navigator, 'maxTouchPoints', {
                get: () => 0,
                configurable: true,
            });

            // 7. Platform (ensure consistency)
            // Don't override - use real value

            // 8. Vendor
            if (navigator.vendor !== 'Google Inc.') {
                Object.defineProperty(navigator, 'vendor', {
                    get: () => 'Google Inc.',
                    configurable: true,
                });
            }
        });
    }

    /**
     * 9-11. Fingerprint masking (WebGL, Canvas, Audio)
     */
    async _applyFingerprintMasking(context) {
        await context.addInitScript(() => {
            // 9. WebGL - Hide SwiftShader/ANGLE detection
            // Realistic GPU configurations for different platforms
            const gpuConfigs = {
                mac: [
                    { vendor: 'Apple Inc.', renderer: 'Apple M1' },
                    { vendor: 'Apple Inc.', renderer: 'Apple M2' },
                    { vendor: 'Apple Inc.', renderer: 'Apple M3' },
                    { vendor: 'Intel Inc.', renderer: 'Intel Iris Pro OpenGL Engine' },
                    { vendor: 'Intel Inc.', renderer: 'Intel UHD Graphics 630' },
                    { vendor: 'AMD', renderer: 'AMD Radeon Pro 5500M OpenGL Engine' },
                ],
                windows: [
                    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
                    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
                    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
                    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
                    { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
                ],
                linux: [
                    { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1080/PCIe/SSE2' },
                    { vendor: 'Intel', renderer: 'Mesa Intel(R) UHD Graphics 630 (CFL GT2)' },
                    { vendor: 'AMD', renderer: 'AMD Radeon RX 580 Series (polaris10, LLVM 12.0.1, DRM 3.42, 5.13.0-44-generic)' },
                ]
            };

            // Detect platform and select appropriate GPU
            const isMac = navigator.platform.includes('Mac');
            const isWindows = navigator.platform.includes('Win');
            const configs = isMac ? gpuConfigs.mac : isWindows ? gpuConfigs.windows : gpuConfigs.linux;
            const selectedGpu = configs[Math.floor(Math.random() * configs.length)];

            const getParameterProxyHandler = {
                apply: function(target, thisArg, args) {
                    const param = args[0];
                    const result = Reflect.apply(target, thisArg, args);
                    
                    // UNMASKED_VENDOR_WEBGL (37445)
                    if (param === 37445) {
                        // Hide SwiftShader
                        if (result && (result.includes('SwiftShader') || result.includes('llvmpipe'))) {
                            return selectedGpu.vendor;
                        }
                        return result || selectedGpu.vendor;
                    }
                    
                    // UNMASKED_RENDERER_WEBGL (37446)
                    if (param === 37446) {
                        // Hide SwiftShader/ANGLE virtual renderers
                        if (result && (result.includes('SwiftShader') || result.includes('llvmpipe') || result.includes('0x0000C0DE'))) {
                            return selectedGpu.renderer;
                        }
                        return result || selectedGpu.renderer;
                    }
                    
                    return result;
                }
            };

            // Wrap WebGL getParameter
            const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = new Proxy(originalGetParameter, getParameterProxyHandler);
            
            if (typeof WebGL2RenderingContext !== 'undefined') {
                const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
                WebGL2RenderingContext.prototype.getParameter = new Proxy(originalGetParameter2, getParameterProxyHandler);
            }

            // Also intercept getExtension for debug renderer info
            const originalGetExtension = WebGLRenderingContext.prototype.getExtension;
            WebGLRenderingContext.prototype.getExtension = function(name) {
                const ext = originalGetExtension.call(this, name);
                if (name === 'WEBGL_debug_renderer_info' && ext) {
                    // Return wrapped extension that uses our spoofed values
                    return ext;
                }
                return ext;
            };

            // 10. Canvas - Add unique noise per session for fingerprint randomization
            // Generate session-unique noise seed
            const noiseSeed = Math.floor(Math.random() * 1000000);
            
            // Simple seeded random for consistent noise within session
            const seededRandom = (seed) => {
                const x = Math.sin(seed) * 10000;
                return x - Math.floor(x);
            };

            // Add noise to canvas data
            const addCanvasNoise = (imageData, seed) => {
                const data = imageData.data;
                // Add subtle noise to multiple pixels (imperceptible but changes hash)
                for (let i = 0; i < Math.min(data.length, 40); i += 4) {
                    // Only modify if not fully transparent
                    if (data[i + 3] > 0) {
                        const noise = seededRandom(seed + i) > 0.5 ? 1 : -1;
                        data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
                        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + (seededRandom(seed + i + 1) > 0.5 ? 1 : -1))); // G
                    }
                }
                return imageData;
            };

            // Override toDataURL
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
                if (this.width > 0 && this.height > 0) {
                    try {
                        const ctx = this.getContext('2d');
                        if (ctx) {
                            const imageData = ctx.getImageData(0, 0, Math.min(this.width, 10), Math.min(this.height, 10));
                            addCanvasNoise(imageData, noiseSeed);
                            ctx.putImageData(imageData, 0, 0);
                        }
                    } catch (e) {}
                }
                return originalToDataURL.call(this, type, quality);
            };

            // Override toBlob
            const originalToBlob = HTMLCanvasElement.prototype.toBlob;
            HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
                if (this.width > 0 && this.height > 0) {
                    try {
                        const ctx = this.getContext('2d');
                        if (ctx) {
                            const imageData = ctx.getImageData(0, 0, Math.min(this.width, 10), Math.min(this.height, 10));
                            addCanvasNoise(imageData, noiseSeed + 1);
                            ctx.putImageData(imageData, 0, 0);
                        }
                    } catch (e) {}
                }
                return originalToBlob.call(this, callback, type, quality);
            };

            // Override getImageData for direct reads
            const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
                const imageData = originalGetImageData.call(this, sx, sy, sw, sh);
                return addCanvasNoise(imageData, noiseSeed + 2);
            };

            // 11. AudioContext fingerprint noise
            if (window.AudioContext || window.webkitAudioContext) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const originalCreateOscillator = AudioContext.prototype.createOscillator;
                AudioContext.prototype.createOscillator = function() {
                    const oscillator = originalCreateOscillator.apply(this, arguments);
                    // Slight frequency variation
                    const originalFrequency = oscillator.frequency.value;
                    oscillator.frequency.value = originalFrequency + (Math.random() * 0.0001);
                    return oscillator;
                };
            }
        });
    }

    /**
     * 12-14. Browser API masking
     */
    async _applyBrowserAPIMasking(context) {
        await context.addInitScript(() => {
            // 12. Permissions API
            const originalQuery = navigator.permissions?.query;
            if (originalQuery) {
                navigator.permissions.query = (parameters) => {
                    if (parameters.name === 'notifications') {
                        return Promise.resolve({ state: 'prompt', onchange: null });
                    }
                    return originalQuery.call(navigator.permissions, parameters);
                };
            }

            // 13. Chrome runtime object
            if (!window.chrome) {
                window.chrome = {};
            }
            if (!window.chrome.runtime) {
                window.chrome.runtime = {
                    connect: () => {},
                    sendMessage: () => {},
                    onMessage: { addListener: () => {}, removeListener: () => {} },
                    onConnect: { addListener: () => {}, removeListener: () => {} },
                };
            }
            if (!window.chrome.app) {
                window.chrome.app = {
                    isInstalled: false,
                    InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
                    RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
                };
            }
            if (!window.chrome.csi) {
                window.chrome.csi = () => ({});
            }
            if (!window.chrome.loadTimes) {
                window.chrome.loadTimes = () => ({});
            }

            // 14. Iframe contentWindow detection bypass
            const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
            Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
                get: function() {
                    const win = originalContentWindow.get.call(this);
                    if (win) {
                        try {
                            // Ensure iframe has same navigator properties
                            if (win.navigator && win.navigator.webdriver !== undefined) {
                                Object.defineProperty(win.navigator, 'webdriver', {
                                    get: () => false,
                                    configurable: true,
                                });
                            }
                        } catch (e) {}
                    }
                    return win;
                },
                configurable: true,
            });
        });
    }

    /**
     * 15-18. Environment masking
     */
    async _applyEnvironmentMasking(context) {
        await context.addInitScript(() => {
            // 15. Outer dimensions consistency
            if (window.outerWidth === 0 || window.outerHeight === 0) {
                Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth + 100, configurable: true });
                Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight + 100, configurable: true });
            }

            // 16. Connection RTT (Network information)
            if (navigator.connection) {
                const realConnection = navigator.connection;
                Object.defineProperty(navigator, 'connection', {
                    get: () => ({
                        ...realConnection,
                        rtt: realConnection.rtt || 50,
                        downlink: realConnection.downlink || 10,
                        effectiveType: realConnection.effectiveType || '4g',
                        saveData: false,
                    }),
                    configurable: true,
                });
            }

            // 17. Media devices enumeration
            if (navigator.mediaDevices?.enumerateDevices) {
                const originalEnumerate = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
                navigator.mediaDevices.enumerateDevices = async () => {
                    const devices = await originalEnumerate();
                    if (devices.length === 0) {
                        // Return fake devices if none found
                        return [
                            { deviceId: 'default', kind: 'audioinput', label: '', groupId: 'default' },
                            { deviceId: 'default', kind: 'audiooutput', label: '', groupId: 'default' },
                        ];
                    }
                    return devices;
                };
            }

            // 18. Battery API
            if (navigator.getBattery) {
                navigator.getBattery = () => Promise.resolve({
                    charging: true,
                    chargingTime: 0,
                    dischargingTime: Infinity,
                    level: 1,
                    addEventListener: () => {},
                    removeEventListener: () => {},
                });
            }
        });
    }

    /**
     * 19-20. Advanced detection bypass
     */
    async _applyAdvancedMasking(context) {
        await context.addInitScript(() => {
            // 19. Function.prototype.toString masking
            const originalFunctionToString = Function.prototype.toString;
            const nativeFunctionString = 'function () { [native code] }';
            
            // Store native functions
            const nativeFunctions = new WeakSet([
                navigator.permissions?.query,
                navigator.mediaDevices?.enumerateDevices,
                navigator.getBattery,
            ].filter(Boolean));
            
            Function.prototype.toString = function() {
                if (nativeFunctions.has(this)) {
                    return nativeFunctionString;
                }
                return originalFunctionToString.call(this);
            };

            // 20. Error stack trace masking
            const originalCaptureStackTrace = Error.captureStackTrace;
            if (originalCaptureStackTrace) {
                Error.captureStackTrace = function(targetObject, constructorOpt) {
                    originalCaptureStackTrace.call(Error, targetObject, constructorOpt);
                    if (targetObject.stack) {
                        // Remove automation-related stack frames
                        targetObject.stack = targetObject.stack
                            .split('\n')
                            .filter(line => !line.includes('puppeteer') && 
                                          !line.includes('playwright') && 
                                          !line.includes('__playwright'))
                            .join('\n');
                    }
                };
            }
        });
    }

    /**
     * Get realistic user agents
     */
    getRandomUserAgent() {
        const userAgents = [
            // Chrome Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            // Chrome Mac
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            // Firefox
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
            // Edge
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    /**
     * Get realistic viewport sizes
     */
    getRandomViewport() {
        const viewports = [
            { width: 1920, height: 1080 },
            { width: 1366, height: 768 },
            { width: 1536, height: 864 },
            { width: 1440, height: 900 },
            { width: 1280, height: 720 },
        ];
        return viewports[Math.floor(Math.random() * viewports.length)];
    }

    /**
     * California location presets
     */
    static CALIFORNIA_LOCATIONS = {
        losAngeles: { latitude: 34.0522, longitude: -118.2437, accuracy: 100 },
        sanFrancisco: { latitude: 37.7749, longitude: -122.4194, accuracy: 100 },
        sanDiego: { latitude: 32.7157, longitude: -117.1611, accuracy: 100 },
        sanJose: { latitude: 37.3382, longitude: -121.8863, accuracy: 100 },
        sacramento: { latitude: 38.5816, longitude: -121.4944, accuracy: 100 },
    };

    /**
     * Get California context options
     * @param {string} city - City name: 'losAngeles', 'sanFrancisco', 'sanDiego', 'sanJose', 'sacramento'
     */
    getCaliforniaContextOptions(city = 'losAngeles', customOptions = {}) {
        const viewport = this.getRandomViewport();
        const location = StealthManager.CALIFORNIA_LOCATIONS[city] || StealthManager.CALIFORNIA_LOCATIONS.losAngeles;
        
        return {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: viewport,
            deviceScaleFactor: 1,
            locale: 'en-US',
            timezoneId: 'America/Los_Angeles',  // California timezone (PST/PDT)
            colorScheme: 'light',
            geolocation: location,
            permissions: ['geolocation'],
            extraHTTPHeaders: {
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'sec-ch-ua': '"Google Chrome";v="120", "Chromium";v="120", "Not(A:Brand";v="24"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'DNT': '1',
            },
            ...customOptions,
        };
    }

    /**
     * Get context options with stealth settings
     */
    getContextOptions(customOptions = {}) {
        const viewport = this.getRandomViewport();
        return {
            userAgent: this.getRandomUserAgent(),
            viewport: viewport,
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
            },
            ...customOptions,
        };
    }

    /**
     * Apply stealth to page (for properties that need page.evaluate)
     * Call this after page creation, before navigation
     * @param {Page} page - Playwright page
     */
    async applyToPage(page) {
        // Generate unique noise seed for this page
        const noiseSeed = Math.floor(Math.random() * 1000000);
        
        await page.evaluate((seed) => {
            // Device Memory - Patchright doesn't have it
            if (!('deviceMemory' in navigator)) {
                Object.defineProperty(navigator, 'deviceMemory', {
                    value: 8,
                    writable: false,
                    configurable: true,
                    enumerable: true,
                });
            }

            // Performance Memory
            if (window.performance && !window.performance.memory) {
                Object.defineProperty(window.performance, 'memory', {
                    value: {
                        jsHeapSizeLimit: 4294705152,
                        totalJSHeapSize: 35839908,
                        usedJSHeapSize: 33207892,
                    },
                    writable: false,
                    configurable: true,
                    enumerable: true,
                });
            }

            // Canvas fingerprint noise (unique per session)
            const seededRandom = (s) => {
                const x = Math.sin(s) * 10000;
                return x - Math.floor(x);
            };

            const addCanvasNoise = (imageData, noiseSeed) => {
                const data = imageData.data;
                for (let i = 0; i < Math.min(data.length, 40); i += 4) {
                    if (data[i + 3] > 0) {
                        data[i] = Math.max(0, Math.min(255, data[i] + (seededRandom(noiseSeed + i) > 0.5 ? 1 : -1)));
                        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + (seededRandom(noiseSeed + i + 1) > 0.5 ? 1 : -1)));
                    }
                }
                return imageData;
            };

            // Override toDataURL
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
                if (this.width > 0 && this.height > 0) {
                    try {
                        const ctx = this.getContext('2d');
                        if (ctx) {
                            const imageData = ctx.getImageData(0, 0, Math.min(this.width, 10), Math.min(this.height, 10));
                            addCanvasNoise(imageData, seed);
                            ctx.putImageData(imageData, 0, 0);
                        }
                    } catch (e) {}
                }
                return originalToDataURL.call(this, type, quality);
            };

            // Override toBlob  
            const originalToBlob = HTMLCanvasElement.prototype.toBlob;
            if (originalToBlob) {
                HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
                    if (this.width > 0 && this.height > 0) {
                        try {
                            const ctx = this.getContext('2d');
                            if (ctx) {
                                const imageData = ctx.getImageData(0, 0, Math.min(this.width, 10), Math.min(this.height, 10));
                                addCanvasNoise(imageData, seed + 1);
                                ctx.putImageData(imageData, 0, 0);
                            }
                        } catch (e) {}
                    }
                    return originalToBlob.call(this, callback, type, quality);
                };
            }

            // Override getImageData
            const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
                const imageData = originalGetImageData.call(this, sx, sy, sw, sh);
                return addCanvasNoise(imageData, seed + 2);
            };
        }, noiseSeed);
    }

    /**
     * Human-like delay
     */
    async humanDelay(min = 500, max = 2000) {
        const delay = min + Math.random() * (max - min);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Human-like mouse movement
     */
    async humanMouseMove(page) {
        const x = 100 + Math.random() * 400;
        const y = 100 + Math.random() * 300;
        await page.mouse.move(x, y, { steps: 10 + Math.floor(Math.random() * 10) });
    }
}

export default StealthManager;

