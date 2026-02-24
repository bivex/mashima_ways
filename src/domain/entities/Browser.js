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

export class Browser {
    constructor(id, config, options = {}) {
        if (!id || typeof id !== 'string') {
            throw new Error('Browser ID must be a non-empty string');
        }

        this.id = id;
        this.config = config;
        this.status = 'stopped'; // stopped, starting, running, stopping, crashed
        this.contexts = new Map(); // contextId -> context
        this.activeContexts = 0;
        this.maxContexts = 50; // configurable
        this.jobsProcessed = 0;
        this.createdAt = new Date();
        this.lastActivity = null;

        // Browser rotation settings (from high-performance manual)
        // Prevents memory leaks by rotating browsers after N pages
        this.maxJobsBeforeRotation = options.maxJobsBeforeRotation || 100; // Rotate after 50-100 pages
    }

    canAcceptJob() {
        return this.status === 'running' && this.activeContexts < this.maxContexts;
    }

    addContext(contextId, context) {
        if (this.contexts.has(contextId)) {
            throw new Error(`Context ${contextId} already exists in browser ${this.id}`);
        }
        this.contexts.set(contextId, context);
        this.activeContexts++;
        this.lastActivity = new Date();
    }

    removeContext(contextId) {
        if (!this.contexts.has(contextId)) {
            // Context already removed - this is normal during cleanup
            console.debug(`Context ${contextId} not found in browser ${this.id} - already cleaned up`);
            return false;
        }
        this.contexts.delete(contextId);
        this.activeContexts--;
        this.jobsProcessed++;
        this.lastActivity = new Date();
        return true;
    }

    markAsRunning() {
        this.status = 'running';
    }

    markAsStopped() {
        this.status = 'stopped';
    }

    markAsCrashed() {
        this.status = 'crashed';
    }

    getLoadFactor() {
        return this.activeContexts / this.maxContexts;
    }

    getActiveContexts() {
        return Array.from(this.contexts.values());
    }

    /**
     * Check if browser should be rotated (from high-performance manual)
     * Browsers should be rotated after 50-100 pages to prevent memory leaks
     */
    shouldRotate() {
        return this.jobsProcessed >= this.maxJobsBeforeRotation;
    }

    /**
     * Get browser lifetime in milliseconds
     */
    getLifetime() {
        return Date.now() - this.createdAt.getTime();
    }

    /**
     * Get browser health metrics
     */
    getHealthMetrics() {
        return {
            id: this.id,
            status: this.status,
            activeContexts: this.activeContexts,
            maxContexts: this.maxContexts,
            jobsProcessed: this.jobsProcessed,
            shouldRotate: this.shouldRotate(),
            loadFactor: this.getLoadFactor(),
            lifetimeMs: this.getLifetime(),
            lastActivity: this.lastActivity
        };
    }
}