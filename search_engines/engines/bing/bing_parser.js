#!/usr/bin/env node
/**
 * Copyright (c) 2025 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2025-12-28T13:28:08
 * Last Updated: 2025-12-28T13:46:30
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Bing Search Parser
 * Simple parser for Bing search results
 */

/**
 * Complete Bing Parser with Pagination and Fixed URL Decoding
 */

import { chromium } from 'patchright';

async function searchBing(query, maxResults = 10, maxPages = 1) {
    const browser = await chromium.launch({ headless: true });
    const allResults = [];
    const resultsPerPage = Math.min(maxResults, 10);

    console.log(`🔍 Searching Bing for: "${query}" (${maxPages} pages, ${maxResults} max results)`);

    try {
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const offset = (pageNum - 1) * resultsPerPage;
            const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${resultsPerPage}&first=${offset + 1}`;

            console.log(`📄 Processing page ${pageNum}/${maxPages} (offset: ${offset})`);

            const context = await browser.newContext();
            const page = await context.newPage();

            try {
                // Блокировка ресурсов
                await page.route('**/*', route => {
                    const type = route.request().resourceType();
                    const url = route.request().url();

                    if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                        return route.abort();
                    }

                    if (url.includes('bing.com/fd/ls') ||
                        url.includes('bat.bing.com') ||
                        url.includes('analytics') ||
                        url.includes('tracking')) {
                        return route.abort();
                    }

                    return route.continue();
                });

                await page.goto(searchUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });

                await page.waitForTimeout(1000);
                await page.waitForTimeout(2000);

                // Парсинг результатов
                const pageResults = await page.evaluate(() => {
                    const searchResults = [];

                    const selectors = [
                        'li.b_algo',
                        '.b_algo',
                        'li[data-idx]',
                        '#b_results li'
                    ];

                    let resultBlocks = [];

                    for (const selector of selectors) {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0) {
                            resultBlocks = Array.from(elements);
                            break;
                        }
                    }

                    for (let i = 0; i < Math.min(resultBlocks.length, 10); i++) {
                        const block = resultBlocks[i];

                        try {
                            let titleElement = block.querySelector('h2 a, a h2, .b_tpcn a');
                            if (!titleElement) {
                                titleElement = block.querySelector('a');
                            }

                            let title = titleElement ? titleElement.textContent.trim() : '';
                            let url = titleElement ? titleElement.href : '';

                            // Декодировать Bing redirect URL
                            if (url && url.includes('bing.com/ck/a')) {
                                try {
                                    const urlObj = new URL(url);
                                    const uParam = urlObj.searchParams.get('u');
                                    if (uParam) {
                                        // Декодировать из base64, удаляя префикс a1
                                        let cleanParam = uParam;
                                        if (uParam.startsWith('a1')) {
                                            cleanParam = uParam.substring(2);
                                        }
                                        url = atob(cleanParam);
                                    }
                                } catch (e) {
                                    console.warn('Could not decode URL:', url);
                                }
                            }

                            // Очистить заголовок
                            if (title.includes('http')) {
                                const parts = title.split('http');
                                title = parts[0].trim();
                                if (title.length < 3) {
                                    const altTitleElement = block.querySelector('h2, .b_tpcn');
                                    if (altTitleElement) {
                                        title = altTitleElement.textContent.trim();
                                    }
                                }
                            }

                            const descriptionElement = block.querySelector('p, .b_caption p, .b_snippet');
                            const description = descriptionElement ? descriptionElement.textContent.trim() : '';

                            if (title && url && url.startsWith('http')) {
                                searchResults.push({
                                    title: title,
                                    url: url,
                                    description: description,
                                    position: i + 1,
                                    page: 1,
                                    engine: 'bing'
                                });
                            }
                        } catch (error) {
                            console.warn(`Error parsing result ${i + 1}:`, error.message);
                        }
                    }

                    return searchResults;
                });

                if (pageResults && pageResults.length > 0) {
                    // Обновить позиции результатов с учетом номера страницы
                    const updatedResults = pageResults.map(result => ({
                        ...result,
                        position: result.position + offset,
                        page: pageNum
                    }));

                    allResults.push(...updatedResults);

                    console.log(`✅ Page ${pageNum}: Found ${pageResults.length} results (total: ${allResults.length})`);

                    // Если собрали достаточно результатов, прекращаем
                    if (allResults.length >= maxResults) {
                        break;
                    }
                } else {
                    console.log(`⚠️ Page ${pageNum}: No results found, stopping pagination`);
                    break;
                }

                // Задержка между страницами
                if (pageNum < maxPages) {
                    console.log('⏳ Waiting 2 seconds before next page...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } finally {
                await page.close();
                await context.close();
            }
        }

        // Ограничить количество результатов
        const finalResults = allResults.slice(0, maxResults);

        console.log(`🎉 Pagination complete: Found ${finalResults.length} results across ${Math.min(maxPages, Math.ceil(finalResults.length / resultsPerPage))} pages`);

        return finalResults;

    } finally {
        await browser.close();
        console.log('🛑 Browser closed');
    }
}

// Тестовая функция
async function testCompleteParser() {
    try {
        console.log('🧪 Testing Complete Bing Parser with Pagination & URL Decoding');
        console.log('=' .repeat(70));

        // Тест 1: Обычный поиск (одна страница)
        console.log('\n📄 TEST 1: Single page search');
        console.log('-'.repeat(30));

        const singlePageResults = await searchBing('how to improve seo', 10, 1);

        console.log(`📊 Single page results: ${singlePageResults.length}\n`);

        singlePageResults.slice(0, 5).forEach((result, index) => {
            console.log(`${index + 1}. ${result.title}`);
            console.log(`   URL: ${result.url}`);
            console.log(`   Page: ${result.page}`);
            console.log('');
        });

        // Тест 2: Поиск с пагинацией (несколько страниц)
        console.log('\n📄 TEST 2: Multi-page search (3 pages, 25 max results)');
        console.log('-'.repeat(50));

        const multiPageResults = await searchBing('how to improve seo', 25, 3);

        console.log(`📊 Multi-page results: ${multiPageResults.length}\n`);

        multiPageResults.forEach((result, index) => {
            if (index < 10) { // Показать первые 10 результатов
                console.log(`${result.position}. ${result.title}`);
                console.log(`   URL: ${result.url}`);
                console.log(`   Page: ${result.page}`);
                console.log('');
            }
        });

        if (multiPageResults.length > 10) {
            console.log(`... and ${multiPageResults.length - 10} more results\n`);
        }

        // Статистика по страницам
        const pageStats = {};
        multiPageResults.forEach(result => {
            pageStats[result.page] = (pageStats[result.page] || 0) + 1;
        });

        console.log('📈 Results distribution by pages:');
        Object.keys(pageStats).sort().forEach(page => {
            console.log(`   Page ${page}: ${pageStats[page]} results`);
        });

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error(error.stack);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    testCompleteParser()
        .then(() => {
            console.log('✅ Test completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Test failed:', error);
            process.exit(1);
        });
}
