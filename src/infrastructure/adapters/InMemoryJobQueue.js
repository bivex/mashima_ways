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

export class InMemoryJobQueue {
    constructor() {
        this.queue = [];
        this.waiting = [];
    }

    async enqueue(job) {
        this.queue.push(job);
        // Notify waiting consumers
        if (this.waiting.length > 0) {
            const resolve = this.waiting.shift();
            resolve(job);
        }
    }

    async dequeue() {
        if (this.queue.length > 0) {
            return this.queue.shift();
        }

        // Wait for a job to be enqueued
        return new Promise((resolve) => {
            this.waiting.push(resolve);
        });
    }

    size() {
        return this.queue.length;
    }

    isEmpty() {
        return this.queue.length === 0;
    }

    clear() {
        this.queue = [];
        // Reject all waiting consumers
        this.waiting.forEach(resolve => resolve(null));
        this.waiting = [];
    }
}