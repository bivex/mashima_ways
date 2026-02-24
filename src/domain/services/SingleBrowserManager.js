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

import {ContextPool} from './ContextPool.js';
import {Semaphore} from './Semaphore.js';
import os from 'os';

/**
 * Single Browser Manager - реализация § 2 архитектуры
 *
 * Управляет ОДНИМ Browser instance и пулом контекстов
 * Это оптимальная архитектура для максимальной скорости на одной машине
 *
 * § 1: ОДИН Browser instance B
 * § 2: Множество BrowserContext: Ctx = {ctx₁, ctx₂, ..., ctxₙ}
 * § 3: N = C × 4 (оптимально для одной машины)
 */
export class SingleBrowserManager {
    constructor(browserAdapter, config = {}) {
        this.browserAdapter = browserAdapter;

        // § 5.1: Параметры оптимизации
        const CPU_CORES = os.cpus().length;
        const CONTEXTS_PER_CORE = config.contextsPerCore || 4;

        this.maxContexts = config.maxContexts || (CPU_CORES * CONTEXTS_PER_CORE);
        this.browserId = 'main-browser'; // Единственный браузер

        // § 2: Context Pool Manager
        this.contextPool = null;

        // § 3: Semaphore для контроля concurrency
        this.semaphore = new Semaphore(this.maxContexts);

        // Tracking
        this.isInitialized = false;
        this.jobsProcessed = 0;

        console.log(`🚀 SingleBrowserManager: будет использовать ${this.maxContexts} контекстов (${CPU_CORES} cores × ${CONTEXTS_PER_CORE})`);
    }

    /**
     * § 3: ИНИЦИАЛИЗАЦИЯ - Запуск единственного браузера
     */
    async initialize(browserConfig) {
        if (this.isInitialized) {
            console.warn('SingleBrowserManager already initialized');
            return;
        }

        console.log(`🌐 Launching single browser instance...`);

        // § 3: B ← launch_browser(headless=true, args=OPTIMIZED_FLAGS)
        await this.browserAdapter.launchBrowser(this.browserId, browserConfig);

        const browser = this.browserAdapter.getBrowser(this.browserId);
        if (!browser) {
            throw new Error('Failed to launch browser');
        }

        // § 3: CPM ← ContextPoolManager(maxContexts=N, rotateAfter=K)
        this.contextPool = new ContextPool(browser, {
            maxSize: this.maxContexts,
            pagesPerContext: 50, // K = 50 из § 3
            contextsPerCore: 4
        });

        this.isInitialized = true;
        console.log(`✅ Single browser initialized with ${this.maxContexts} context slots`);
    }

    /**
     * § 3: Получить контекст для выполнения задачи
     * Реализует: ctx ← CPM.get_or_create()
     */
    async acquireContext(jobId) {
        if (!this.isInitialized) {
            throw new Error('SingleBrowserManager not initialized');
        }

        // § 3: await S.acquire() - Захват слота concurrency
        await this.semaphore.acquire();

        try {
            // Получить контекст из пула
            const { id, context } = await this.contextPool.acquire();
            return { contextId: id, context, browserId: this.browserId };
        } catch (error) {
            // Если не удалось получить контекст, освободить семафор
            this.semaphore.release();
            throw error;
        }
    }

    /**
     * § 3: Вернуть контекст в пул
     * Реализует: CPM.return(ctx) + S.release()
     */
    releaseContext(contextId) {
        if (!this.contextPool) {
            console.warn('ContextPool not initialized');
            return;
        }

        // Вернуть контекст в пул
        this.contextPool.release(contextId);

        // § 3: S.release() - Освободить слот concurrency
        this.semaphore.release();

        this.jobsProcessed++;
    }

    /**
     * Получить страницу из контекста
     */
    async createPage(contextId) {
        const state = this.contextPool.inUse.get(contextId);
        if (!state) {
            throw new Error(`Context ${contextId} not found in pool`);
        }

        return await state.context.newPage();
    }

    /**
     * Получить статистику
     */
    getStats() {
        return {
            browser: {
                id: this.browserId,
                isRunning: this.isInitialized,
                jobsProcessed: this.jobsProcessed
            },
            contextPool: this.contextPool ? this.contextPool.getStats() : null,
            semaphore: this.semaphore.getStats()
        };
    }

    /**
     * § 6: Теорема максимальной скорости
     * Throughput = N / T_avg
     */
    calculateThroughput(avgTimePerJobMs) {
        const avgTimeSec = avgTimePerJobMs / 1000;
        return this.maxContexts / avgTimeSec; // URLs/sec
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('🛑 SingleBrowserManager: Shutting down...');

        if (this.contextPool) {
            await this.contextPool.cleanup();
        }

        if (this.isInitialized) {
            await this.browserAdapter.closeBrowser(this.browserId);
        }

        this.isInitialized = false;
        console.log('✅ SingleBrowserManager shut down');
    }

    /**
     * Health check - проверка работоспособности браузера
     */
    isHealthy() {
        return this.isInitialized &&
            this.browserAdapter.isBrowserRunning(this.browserId);
    }

    /**
     * Принудительная ротация всех контекстов
     * Полезно для профилактики утечек памяти
     */
    async rotateAllContexts() {
        if (this.contextPool) {
            return await this.contextPool.rotateAll();
        }
        return [];
    }
}
