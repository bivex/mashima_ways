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

import os from 'os';

/**
 * Context Pool Manager - формальная реализация из § 5.2 архитектуры
 *
 * Управляет пулом BrowserContext для максимальной производительности
 * на одной машине с единственным Browser instance
 *
 * Ключевые принципы:
 * - ОДИН Browser instance
 * - МНОГО легковесных контекстов (N = CPU_CORES × 4)
 * - Ротация каждые 50 страниц для предотвращения утечек памяти
 * - Переиспользование контекстов вместо создания новых
 */
export class ContextPool {
    constructor(browser, options = {}) {
        this.browser = browser;

        // § 5.1 Оптимальные параметры из архитектуры
        const CPU_CORES = os.cpus().length;
        const CONTEXTS_PER_CORE = options.contextsPerCore || 4;

        this.maxSize = options.maxSize || (CPU_CORES * CONTEXTS_PER_CORE);
        this.pagesPerContext = options.pagesPerContext || 50; // § 3: K = 50
        this.contextLifetimeMs = options.contextLifetimeMs || (5 * 60000); // 5 минут

        // § 4: Состояние пула
        this.available = []; // Свободные контексты (Queue)
        this.inUse = new Map(); // Занятые контексты: contextID -> ContextState
        this.contextCounter = 0;

        console.log(`🔧 ContextPool initialized: maxSize=${this.maxSize} (${CPU_CORES} cores × ${CONTEXTS_PER_CORE})`);
    }

    /**
     * § 4: Получить контекст из пула
     * Реализует алгоритм из § 3: CPM.get_or_create()
     */
    async acquire() {
        // 1. Взять свободный контекст если есть
        if (this.available.length > 0) {
            const state = this.available.pop();

            // § 4: Проверка на необходимость ротации
            if (this._needsRotation(state)) {
                await state.context.close();
                state.context = await this._createContext();
                state.pageCount = 0;
                state.createdAt = Date.now();
            }

            this.inUse.set(state.id, state);
            return { id: state.id, context: state.context };
        }

        // 2. Создать новый если есть место
        if (this.inUse.size < this.maxSize) {
            const id = `ctx-${++this.contextCounter}`;
            const context = await this._createContext();
            const state = {
                id,
                context,
                pageCount: 0,
                createdAt: Date.now(),
                lastUsed: Date.now()
            };

            this.inUse.set(id, state);
            return { id, context };
        }

        // 3. Ждем освобождения контекста (все слоты заняты)
        return new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (this.available.length > 0) {
                    clearInterval(checkInterval);
                    resolve(this.acquire());
                }
            }, 50);
        });
    }

    /**
     * § 4: Вернуть контекст в пул
     * Реализует: CPM.return(ctx)
     */
    release(id) {
        const state = this.inUse.get(id);
        if (!state) {
            console.warn(`ContextPool: Attempt to release unknown context ${id}`);
            return;
        }

        // Обновить счетчики
        state.pageCount++;
        state.lastUsed = Date.now();

        // Переместить из inUse в available
        this.inUse.delete(id);
        this.available.push(state);
    }

    /**
     * § 5.2: Создание оптимизированного контекста
     */
    async _createContext() {
        return await this.browser.newContext({
            viewport: { width: 800, height: 600 }, // Минимальный viewport
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ignoreHTTPSErrors: true,
            serviceWorkers: 'block', // § 5.2: Отключение для стабильности
            acceptDownloads: false,
            bypassCSP: true,
        });
    }

    /**
     * § 4: Правила ротации контекста
     * IF (ctx.pageCount >= maxPagesPerContext) OR (now - ctx.lastUsed > 5min)
     */
    _needsRotation(state) {
        const pageCountExceeded = state.pageCount >= this.pagesPerContext;
        const lifetimeExceeded = (Date.now() - state.createdAt) > this.contextLifetimeMs;

        return pageCountExceeded || lifetimeExceeded;
    }

    /**
     * Получить статистику пула
     */
    getStats() {
        return {
            maxSize: this.maxSize,
            available: this.available.length,
            inUse: this.inUse.size,
            total: this.available.length + this.inUse.size,
            contexts: Array.from(this.inUse.values()).map(state => ({
                id: state.id,
                pageCount: state.pageCount,
                age: Date.now() - state.createdAt,
                needsRotation: this._needsRotation(state)
            }))
        };
    }

    /**
     * § 4: Полная очистка пула
     */
    async cleanup() {
        // Закрыть все свободные контексты
        for (const state of this.available) {
            try {
                await state.context.close();
            } catch (error) {
                console.warn(`Error closing available context ${state.id}:`, error.message);
            }
        }

        // Закрыть все используемые контексты
        for (const state of this.inUse.values()) {
            try {
                await state.context.close();
            } catch (error) {
                console.warn(`Error closing in-use context ${state.id}:`, error.message);
            }
        }

        this.available = [];
        this.inUse.clear();

        console.log('✅ ContextPool cleaned up');
    }

    /**
     * Принудительная ротация всех контекстов
     * Полезно для периодического обновления
     */
    async rotateAll() {
        const rotated = [];

        for (const state of this.available) {
            await state.context.close();
            state.context = await this._createContext();
            state.pageCount = 0;
            state.createdAt = Date.now();
            rotated.push(state.id);
        }

        console.log(`🔄 Rotated ${rotated.length} contexts`);
        return rotated;
    }
}
