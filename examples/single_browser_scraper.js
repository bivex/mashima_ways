/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-24 23:47
 * Last Updated: 2026-02-24 23:47
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * § 5.3 Полная реализация Single Browser Architecture
 *
 * Максимальная скорость на одной машине:
 * - ОДИН Browser instance
 * - N = CPU_CORES × 4 контекстов
 * - Ротация каждые 50 страниц
 * - Блокировка ресурсов (60-70% ускорения)
 * - waitUntil: 'domcontentloaded'
 *
 * § 6 Производительность:
 * Для 8-core машины:
 *   N = 32 контекста
 *   T_avg = 1.2s
 *   Throughput = 26.7 URLs/сек = 1,600 URLs/мин = 96,000 URLs/час
 */

import {PlaywrightBrowserAdapter} from '../src/infrastructure/adapters/PlaywrightBrowserAdapter.js';
import {SingleBrowserManager} from '../src/domain/services/SingleBrowserManager.js';
import {BrowserConfig} from '../src/domain/value-objects/BrowserConfig.js';
import os from 'os';

/**
 * § 8 Performance Monitor - отслеживание метрик
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            urlsProcessed: 0,
            urlsSuccess: 0,
            urlsFailed: 0,
            totalTimeMs: 0,
            avgTimePerUrl: 0,
            throughput: 0,
        };
        this.startTime = Date.now();
    }

    record(success, timeMs) {
        this.metrics.urlsProcessed++;
        if (success) this.metrics.urlsSuccess++;
        else this.metrics.urlsFailed++;

        this.metrics.totalTimeMs += timeMs;
        this.metrics.avgTimePerUrl =
            this.metrics.totalTimeMs / this.metrics.urlsProcessed;

        const elapsedSec = (Date.now() - this.startTime) / 1000;
        this.metrics.throughput = this.metrics.urlsProcessed / elapsedSec;
    }

    report() {
        const elapsedSec = (Date.now() - this.startTime) / 1000;
        return `
═══════════════════════════════════════════════════
        PERFORMANCE REPORT
═══════════════════════════════════════════════════
URLs обработано:     ${this.metrics.urlsProcessed}
Успешных:            ${this.metrics.urlsSuccess}
Ошибок:              ${this.metrics.urlsFailed}
Среднее время:       ${this.metrics.avgTimePerUrl.toFixed(0)}ms/URL
Throughput:          ${this.metrics.throughput.toFixed(2)} URLs/сек
Общее время:         ${elapsedSec.toFixed(1)}с
═══════════════════════════════════════════════════
        `;
    }
}

/**
 * § 3 Worker - обработка одного URL
 */
async function processUrl(url, browserManager, monitor) {
    const startTime = Date.now();
    let contextId = null;
    let page = null;

    try {
        // § 3: await S.acquire() + ctx ← CPM.get_or_create()
        const { contextId: id, context } = await browserManager.acquireContext(url);
        contextId = id;

        // Создать страницу
        page = await context.newPage();

        // § 7.1 КРИТИЧНО: Блокировка ресурсов (экономия 60-70% времени)
        await page.route('**/*', route => {
            const type = route.request().resourceType();
            const url = route.request().url();

            // Блокировать images, css, fonts, media
            if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                return route.abort();
            }

            // Блокировать аналитику
            if (url.includes('google-analytics') ||
                url.includes('facebook.com/tr') ||
                url.includes('doubleclick') ||
                url.includes('hotjar') ||
                url.includes('mixpanel')) {
                return route.abort();
            }

            return route.continue();
        });

        // § 7.2: waitUntil: 'domcontentloaded' (НЕ 'networkidle' - это медленно!)
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Парсинг данных
        const data = await page.evaluate(() => {
            return {
                title: document.title,
                url: window.location.href,
                // Добавьте свою логику парсинга
            };
        });

        const duration = Date.now() - startTime;
        monitor.record(true, duration);

        return { url, data, success: true, duration };

    } catch (error) {
        const duration = Date.now() - startTime;
        monitor.record(false, duration);

        return { url, error: error.message, success: false, duration };

    } finally {
        // § 3: Обязательная очистка
        if (page) await page.close();
        if (contextId) browserManager.releaseContext(contextId);
    }
}

/**
 * § 5.3 Основная функция - максимальная скорость
 */
async function scrapeWithMaxSpeed(urls) {
    console.log('🚀 Starting Single Browser Architecture Scraper');
    console.log(`📊 System: ${os.cpus().length} CPU cores`);
    console.log(`🎯 Max contexts: ${os.cpus().length * 4}`);
    console.log(`📝 URLs to process: ${urls.length}\n`);

    const monitor = new PerformanceMonitor();

    // § 3: ИНИЦИАЛИЗАЦИЯ
    const adapter = new PlaywrightBrowserAdapter();
    const browserManager = new SingleBrowserManager(adapter, {
        contextsPerCore: 4 // § 3: N = C × 4
    });

    // § 5.3: Оптимизированная конфигурация браузера
    const config = BrowserConfig.forSingleBrowserArchitecture();

    try {
        // Запуск единственного браузера
        await browserManager.initialize(config);

        // § 3 PIPELINE: Обработка всех URL
        const workers = [];

        for (const url of urls) {
            const workerTask = processUrl(url, browserManager, monitor);
            workers.push(workerTask);
        }

        // Ждем завершения всех воркеров
        console.log('⏳ Processing URLs...\n');
        const results = await Promise.all(workers);

        // Вывод результатов
        console.log(monitor.report());

        // § 6: Расчет теоретической производительности
        const stats = browserManager.getStats();
        const throughput = browserManager.calculateThroughput(monitor.metrics.avgTimePerUrl);

        console.log('\n📈 THEORETICAL PERFORMANCE (§6):');
        console.log(`   Max contexts (N): ${stats.semaphore.maxConcurrent}`);
        console.log(`   Avg time (T):     ${monitor.metrics.avgTimePerUrl.toFixed(0)}ms`);
        console.log(`   Throughput:       ${throughput.toFixed(2)} URLs/сек`);
        console.log(`   Per minute:       ${(throughput * 60).toFixed(0)} URLs/мин`);
        console.log(`   Per hour:         ${(throughput * 3600).toFixed(0)} URLs/час\n`);

        return results;

    } finally {
        // Cleanup
        await browserManager.shutdown();
    }
}

// § 5.4 Использование
const testUrls = [
    'https://example.com',
    'https://example.org',
    'https://example.net',
    // Добавьте свои URL
];

// Запуск только если файл запущен напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
    scrapeWithMaxSpeed(testUrls)
        .then(results => {
            console.log(`✅ Scraping completed!`);
            console.log(`   Success: ${results.filter(r => r.success).length}`);
            console.log(`   Failed:  ${results.filter(r => !r.success).length}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
}

export { scrapeWithMaxSpeed, PerformanceMonitor };
