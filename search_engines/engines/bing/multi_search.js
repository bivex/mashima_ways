#!/usr/bin/env node
/**
 * Copyright (c) 2025 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2025-12-28T15:36:21
 * Last Updated: 2025-12-28T15:36:21
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Multi-keyword Bing Search for Low CPC Software/Development Keywords
 * 
 * Searches multiple keywords and saves all URLs to file
 */

import { chromium } from 'patchright';
import fs from 'fs';
import path from 'path';

// Low CPC keywords for software development market
const SOFTWARE_KEYWORDS = [
    // Development tools
    'free code editor download',
    'open source ide',
    'best free programming tools',
    'code snippet manager free',
    'free debugging tools',
    
    // Automation & Scripts
    'automation scripts download',
    'free task automation software',
    'batch processing tools free',
    'workflow automation free',
    
    // Development utilities
    'free api testing tool',
    'json formatter online free',
    'code beautifier free',
    'regex tester online',
    'free database tool',
    
    // Web development
    'free website builder no code',
    'html css generator free',
    'free landing page builder',
    'static site generator free',
    
    // Mobile development
    'free mobile app builder',
    'cross platform app development free',
    'app prototype tool free',
    
    // Data & Analytics
    'free data visualization tool',
    'csv editor free download',
    'free log analyzer',
    'free monitoring tool',
    
    // Security tools
    'free password manager',
    'free vpn software',
    'free antivirus software',
    'free encryption tool',
    
    // Productivity
    'free project management tool',
    'free time tracking software',
    'free note taking app',
    'free clipboard manager',
    
    // File utilities
    'free file converter',
    'free pdf editor',
    'free image compressor',
    'free video converter',
    
    // System utilities
    'free system cleaner',
    'free backup software',
    'free disk analyzer',
    'free uninstaller tool',
];

/**
 * Search single keyword on Bing
 */
async function searchKeyword(browser, keyword, resultsPerKeyword = 10) {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(keyword)}&count=10`;
    
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
    });

    const page = await context.newPage();
    const results = [];

    try {
        // Block resources
        await page.route('**/*', route => {
            const type = route.request().resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                return route.abort();
            }
            return route.continue();
        });

        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000 + Math.random() * 1000);

        // Parse results
        const pageResults = await page.evaluate(() => {
            const searchResults = [];
            const resultBlocks = Array.from(document.querySelectorAll('li.b_algo, .b_algo'));

            for (let i = 0; i < Math.min(resultBlocks.length, 10); i++) {
                const block = resultBlocks[i];
                try {
                    const h2Element = block.querySelector('h2');
                    const linkElement = h2Element?.querySelector('a') || block.querySelector('h2 a');
                    
                    let title = linkElement?.innerText?.trim() || '';
                    let url = linkElement?.href || '';

                    // Decode Bing redirect
                    if (url && url.includes('bing.com/ck/a')) {
                        try {
                            const urlObj = new URL(url);
                            const uParam = urlObj.searchParams.get('u');
                            if (uParam) {
                                let cleanParam = uParam.startsWith('a1') ? uParam.substring(2) : uParam;
                                url = atob(cleanParam);
                            }
                        } catch (e) {}
                    }

                    const descElement = block.querySelector('.b_caption p, p.b_lineclamp2, .b_snippet');
                    const description = descElement?.innerText?.trim() || '';

                    if (title && url && url.startsWith('http') && !url.includes('bing.com')) {
                        searchResults.push({ title, url, description });
                    }
                } catch (e) {}
            }
            return searchResults;
        });

        results.push(...pageResults.slice(0, resultsPerKeyword));

    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
    } finally {
        await page.close();
        await context.close();
    }

    return results;
}

/**
 * Multi-keyword search
 */
async function multiSearch(keywords, options = {}) {
    const {
        resultsPerKeyword = 10,
        outputFile = 'urls.txt',
        headless = false,
        delayBetweenSearches = 3000,
    } = options;

    console.log('🚀 Multi-Keyword Bing Search');
    console.log('='.repeat(60));
    console.log(`📝 Keywords: ${keywords.length}`);
    console.log(`🎯 Results per keyword: ${resultsPerKeyword}`);
    console.log(`💾 Output: ${outputFile}`);
    console.log('');

    const browser = await chromium.launch({
        headless: headless,
        args: ['--disable-blink-features=AutomationControlled'],
    });

    const allResults = [];
    const allUrls = new Set();

    try {
        for (let i = 0; i < keywords.length; i++) {
            const keyword = keywords[i];
            console.log(`\n[${i + 1}/${keywords.length}] 🔍 "${keyword}"`);

            // Delay between searches
            if (i > 0) {
                const delay = delayBetweenSearches + Math.random() * 2000;
                await new Promise(r => setTimeout(r, delay));
            }

            const results = await searchKeyword(browser, keyword, resultsPerKeyword);
            
            // Add unique URLs
            let newCount = 0;
            results.forEach(r => {
                if (!allUrls.has(r.url)) {
                    allUrls.add(r.url);
                    allResults.push({ ...r, keyword });
                    newCount++;
                }
            });

            console.log(`   ✅ Found ${results.length} results (${newCount} new, ${allUrls.size} total unique)`);
        }

    } finally {
        await browser.close();
    }

    // Save to file
    const outputPath = path.resolve(outputFile);
    const urlsList = Array.from(allUrls).join('\n') + '\n';
    fs.writeFileSync(outputPath, urlsList, 'utf8');

    console.log('\n' + '='.repeat(60));
    console.log(`🎉 Complete!`);
    console.log(`   📊 Total unique URLs: ${allUrls.size}`);
    console.log(`   💾 Saved to: ${outputPath}`);

    return {
        results: allResults,
        urls: Array.from(allUrls),
        totalKeywords: keywords.length,
        totalUrls: allUrls.size,
    };
}

// CLI
async function main() {
    const args = process.argv.slice(2);
    
    let keywords = SOFTWARE_KEYWORDS;
    let outputFile = 'urls.txt';
    let resultsPerKeyword = 10;
    let headless = false;

    // Parse args
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--file' && args[i + 1]) {
            // Load keywords from file
            const filePath = args[++i];
            if (fs.existsSync(filePath)) {
                keywords = fs.readFileSync(filePath, 'utf8')
                    .split('\n')
                    .map(k => k.trim())
                    .filter(k => k.length > 0);
            }
        } else if (args[i] === '--output' && args[i + 1]) {
            outputFile = args[++i];
        } else if (args[i] === '--results' && args[i + 1]) {
            resultsPerKeyword = parseInt(args[++i]);
        } else if (args[i] === '--headless') {
            headless = true;
        } else if (args[i] === '--help') {
            console.log(`
Multi-Keyword Bing Search

Usage:
  node multi_search.js [options]

Options:
  --file <path>      Load keywords from file (one per line)
  --output <path>    Output file (default: urls.txt)
  --results <n>      Results per keyword (default: 10)
  --headless         Run in headless mode
  --help             Show this help

Examples:
  node multi_search.js
  node multi_search.js --file keywords.txt --output results.txt
  node multi_search.js --results 20 --headless
`);
            process.exit(0);
        }
    }

    console.log(`\n🎯 Low CPC Software Development Keywords Search\n`);

    const result = await multiSearch(keywords, {
        resultsPerKeyword,
        outputFile,
        headless,
        delayBetweenSearches: 2000,
    });

    // Save detailed results
    const detailedPath = outputFile.replace('.txt', '_detailed.json');
    fs.writeFileSync(detailedPath, JSON.stringify(result.results, null, 2), 'utf8');
    console.log(`   📋 Detailed results: ${detailedPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { multiSearch, searchKeyword, SOFTWARE_KEYWORDS };

