#!/usr/bin/env node
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

import {ScrapingCLI} from './presentation/cli/ScrapingCLI.js';

async function main() {
    const cli = new ScrapingCLI();

    try {
        await cli.start();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main();