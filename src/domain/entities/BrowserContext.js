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

export class BrowserContext {
    constructor(id, browserId, jobId, options = {}) {
        if (!id || typeof id !== 'string') {
            throw new Error('Context ID must be a non-empty string');
        }
        if (!browserId || typeof browserId !== 'string') {
            throw new Error('Browser ID must be a non-empty string');
        }
        if (!jobId || typeof jobId !== 'string') {
            throw new Error('Job ID must be a non-empty string');
        }

        this.id = id;
        this.browserId = browserId;
        this.jobId = jobId;
        this.status = 'created'; // created, active, closing, closed
        this.createdAt = new Date();
        this.closedAt = null;

        // Performance tracking (best practice from manual)
        this.pagesProcessed = 0;
        this.maxPagesPerContext = options.maxPagesPerContext || 10; // Rotate every 10 pages
        this.resourceBlockingEnabled = options.resourceBlockingEnabled !== false;
    }

    markAsActive() {
        this.status = 'active';
    }

    markAsClosing() {
        this.status = 'closing';
    }

    markAsClosed() {
        this.status = 'closed';
        this.closedAt = new Date();
    }

    isActive() {
        return this.status === 'active';
    }

    isClosed() {
        return this.status === 'closed';
    }

    // Performance tracking methods (from manual best practices)
    incrementPageCount() {
        this.pagesProcessed++;
    }

    shouldRotate() {
        return this.pagesProcessed >= this.maxPagesPerContext;
    }

    getPageCount() {
        return this.pagesProcessed;
    }

    getLifetimeDuration() {
        const end = this.closedAt || new Date();
        return end - this.createdAt;
    }
}