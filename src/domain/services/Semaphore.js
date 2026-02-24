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

/**
 * Semaphore для контроля concurrency
 * Реализация из § 3 архитектуры
 *
 * Используется для ограничения количества одновременных задач
 * maxConcurrent = min(N, C × 3) где N - количество контекстов, C - CPU cores
 */
export class Semaphore {
    constructor(maxConcurrent) {
        this.maxConcurrent = maxConcurrent;
        this.current = 0;
        this.queue = [];
    }

    /**
     * § 3: S.acquire() - Захват слота concurrency
     */
    async acquire() {
        if (this.current < this.maxConcurrent) {
            this.current++;
            return;
        }

        // Ждем освобождения слота
        return new Promise(resolve => {
            this.queue.push(resolve);
        });
    }

    /**
     * § 3: S.release() - Освобождение слота
     */
    release() {
        this.current--;

        // Если есть ожидающие, дать им слот
        if (this.queue.length > 0) {
            this.current++;
            const resolve = this.queue.shift();
            resolve();
        }
    }

    /**
     * Получить текущее состояние
     */
    getStats() {
        return {
            maxConcurrent: this.maxConcurrent,
            current: this.current,
            waiting: this.queue.length,
            available: this.maxConcurrent - this.current
        };
    }
}
