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
 * Context Manager for efficient context reuse and rotation
 * Based on high-performance Playwright manual best practices
 *
 * Manages browser contexts with automatic rotation every N pages
 * to prevent memory leaks and maintain performance
 */
export class ContextManager {
    constructor(browserAdapter, options = {}) {
        this.browserAdapter = browserAdapter;
        this.contexts = new Map(); // browserId -> { context, contextId, pageCount }
        this.maxPagesPerContext = options.maxPagesPerContext || 10; // Rotate every 10 pages
        this.contextCounter = 0;
    }

    /**
     * Get existing context or create/recycle if needed
     * Automatically rotates contexts after maxPagesPerContext pages
     */
    async getOrRecycleContext(browserId, jobId) {
        const contextData = this.contexts.get(browserId);

        // Need to create or recycle context
        if (!contextData || contextData.pageCount >= this.maxPagesPerContext) {
            // Close old context if exists
            if (contextData) {
                try {
                    await this.browserAdapter.closeContext(browserId, contextData.contextId);
                } catch (error) {
                    console.warn(`Error closing old context ${contextData.contextId}:`, error.message);
                }
            }

            // Create new context
            const contextId = `ctx-managed-${browserId}-${++this.contextCounter}`;
            await this.browserAdapter.createContext(browserId, contextId);

            this.contexts.set(browserId, {
                contextId,
                pageCount: 0,
                createdAt: Date.now()
            });

            return contextId;
        }

        // Increment page count and return existing context
        contextData.pageCount++;
        return contextData.contextId;
    }

    /**
     * Get existing context without auto-rotation
     * Used when you want manual control over context lifecycle
     */
    getContext(browserId) {
        const contextData = this.contexts.get(browserId);
        return contextData ? contextData.contextId : null;
    }

    /**
     * Manually increment page count for a browser's context
     */
    incrementPageCount(browserId) {
        const contextData = this.contexts.get(browserId);
        if (contextData) {
            contextData.pageCount++;
        }
    }

    /**
     * Check if context should be rotated
     */
    shouldRotate(browserId) {
        const contextData = this.contexts.get(browserId);
        return contextData && contextData.pageCount >= this.maxPagesPerContext;
    }

    /**
     * Force rotation of context for a browser
     */
    async rotateContext(browserId, jobId) {
        const contextData = this.contexts.get(browserId);
        if (contextData) {
            contextData.pageCount = this.maxPagesPerContext; // Force rotation on next get
        }
        return this.getOrRecycleContext(browserId, jobId);
    }

    /**
     * Get statistics about context usage
     */
    getStats() {
        const stats = {
            totalContexts: this.contexts.size,
            contexts: []
        };

        for (const [browserId, data] of this.contexts.entries()) {
            stats.contexts.push({
                browserId,
                contextId: data.contextId,
                pageCount: data.pageCount,
                shouldRotate: data.pageCount >= this.maxPagesPerContext,
                ageMs: Date.now() - data.createdAt
            });
        }

        return stats;
    }

    /**
     * Clean up all managed contexts
     */
    async cleanup() {
        const cleanupPromises = [];

        for (const [browserId, data] of this.contexts.entries()) {
            cleanupPromises.push(
                this.browserAdapter.closeContext(browserId, data.contextId)
                    .catch(error => console.warn(`Error cleaning up context ${data.contextId}:`, error.message))
            );
        }

        await Promise.all(cleanupPromises);
        this.contexts.clear();
    }

    /**
     * Remove a browser's context from tracking
     */
    async removeContext(browserId) {
        const contextData = this.contexts.get(browserId);
        if (contextData) {
            try {
                await this.browserAdapter.closeContext(browserId, contextData.contextId);
            } catch (error) {
                console.warn(`Error removing context ${contextData.contextId}:`, error.message);
            }
            this.contexts.delete(browserId);
        }
    }
}
