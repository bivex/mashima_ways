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

export class BrowserPoolService {
    constructor(browserPoolManager, config) {
        this.browserPoolManager = browserPoolManager;
        this.config = config;
    }

    async initialize() {
        await this.browserPoolManager.initialize();
    }

    async shutdown() {
        await this.browserPoolManager.shutdown();
    }

    getStats() {
        return this.browserPoolManager.getBrowserStats();
    }

    async restartBrowser(browserId) {
        await this.browserPoolManager.restartBrowser(browserId);
    }
}