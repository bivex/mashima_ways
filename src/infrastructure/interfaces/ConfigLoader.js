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

import {config as defaultConfig} from '../../../config/default.js';

export class ConfigLoader {
    static load() {
        // In a real application, this could load from environment variables,
        // config files, etc. For now, just return the default config.

        // Override with environment variables if present
        const envConfig = {
            browser: {
                poolSize: process.env.BROWSER_POOL_SIZE ? parseInt(process.env.BROWSER_POOL_SIZE) : undefined,
                maxContextsPerBrowser: process.env.MAX_CONTEXTS_PER_BROWSER ? parseInt(process.env.MAX_CONTEXTS_PER_BROWSER) : undefined,
                globalMaxConcurrency: process.env.GLOBAL_MAX_CONCURRENCY ? parseInt(process.env.GLOBAL_MAX_CONCURRENCY) : undefined,
                headless: process.env.BROWSER_HEADLESS !== 'false',
                rotateUserAgents: process.env.ROTATE_USER_AGENTS !== 'false'
            },
            job: {
                defaultTimeout: process.env.JOB_TIMEOUT ? parseInt(process.env.JOB_TIMEOUT) : undefined,
                defaultRetries: process.env.JOB_RETRIES ? parseInt(process.env.JOB_RETRIES) : undefined
            }
        };

        // Deep merge configs
        return this._deepMerge(defaultConfig, envConfig);
    }

    static _deepMerge(target, source) {
        const result = {...target};

        for (const key in source) {
            if (source[key] !== undefined) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    result[key] = this._deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }
}