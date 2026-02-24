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

import {Url} from '../value-objects/Url.js';

export class Job {
    constructor(id, url, options = {}) {
        if (!id || typeof id !== 'string') {
            throw new Error('Job ID must be a non-empty string');
        }

        this.id = id;
        this.url = url instanceof Url ? url : new Url(url);
        this.options = {
            timeout: options.timeout || 30000,
            waitUntil: options.waitUntil || 'domcontentloaded',
            javaScriptEnabled: options.javaScriptEnabled !== false,
            retries: options.retries || 0,
            ...options
        };
        this.status = 'pending'; // pending, running, completed, failed, canceled
        this.createdAt = new Date();
        this.startedAt = null;
        this.completedAt = null;
        this.attempts = 0;
    }

    markAsRunning() {
        if (this.status !== 'pending' && this.status !== 'failed') {
            throw new Error(`Cannot start job ${this.id} with status ${this.status}`);
        }
        this.status = 'running';
        this.startedAt = new Date();
        this.attempts++;
    }

    markAsCompleted(result) {
        if (this.isTerminal()) return; // Prevent double-termination
        this.status = 'completed';
        this.completedAt = new Date();
        this.result = result;
    }

    markAsFailed(error) {
        if (this.isTerminal()) return; // Prevent double-termination
        this.status = 'failed';
        this.completedAt = new Date();
        this.error = error;
    }

    markAsCanceled() {
        if (this.isTerminal()) return; // Prevent double-termination
        this.status = 'canceled';
        this.completedAt = new Date();
    }

    canRetry() {
        return this.attempts < (this.options.retries + 1);
    }

    getDuration() {
        if (!this.startedAt || !this.completedAt) {
            return null;
        }
        return this.completedAt.getTime() - this.startedAt.getTime();
    }

    isPending() {
        return this.status === 'pending';
    }

    isRunning() {
        return this.status === 'running';
    }

    isCompleted() {
        return this.status === 'completed';
    }

    isFailed() {
        return this.status === 'failed';
    }

    isCanceled() {
        return this.status === 'canceled';
    }

    isTerminal() {
        return this.isCompleted() || this.isFailed() || this.isCanceled();
    }
}