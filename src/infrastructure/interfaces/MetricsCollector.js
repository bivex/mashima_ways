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

import {logger} from './Logger.js';

export class MetricsCollector {
    constructor() {
        this.metrics = {
            jobsSubmitted: 0,
            jobsCompleted: 0,
            jobsFailed: 0,
            browserRestarts: 0,
            activeContexts: 0,
            totalContextsCreated: 0,
            jobDurations: [],
            errors: []
        };

        this.startTime = Date.now();
    }

    recordJobSubmitted() {
        this.metrics.jobsSubmitted++;
    }

    recordJobCompleted(duration) {
        this.metrics.jobsCompleted++;
        this.metrics.jobDurations.push(duration);
        // Keep only last 1000 durations for memory efficiency
        if (this.metrics.jobDurations.length > 1000) {
            this.metrics.jobDurations.shift();
        }
    }

    recordJobFailed(error) {
        this.metrics.jobsFailed++;
        this.metrics.errors.push({
            timestamp: new Date(),
            error: error.message
        });
        // Keep only last 100 errors
        if (this.metrics.errors.length > 100) {
            this.metrics.errors.shift();
        }
    }

    recordBrowserRestart() {
        this.metrics.browserRestarts++;
    }

    updateActiveContexts(count) {
        this.metrics.activeContexts = count;
    }

    recordContextCreated() {
        this.metrics.totalContextsCreated++;
    }

    getMetrics() {
        const uptime = Date.now() - this.startTime;
        const avgDuration = this.metrics.jobDurations.length > 0
            ? this.metrics.jobDurations.reduce((a, b) => a + b, 0) / this.metrics.jobDurations.length
            : 0;

        return {
            uptime,
            jobs: {
                submitted: this.metrics.jobsSubmitted,
                completed: this.metrics.jobsCompleted,
                failed: this.metrics.jobsFailed,
                successRate: this.metrics.jobsSubmitted > 0
                    ? (this.metrics.jobsCompleted / this.metrics.jobsSubmitted * 100).toFixed(2) + '%'
                    : '0%'
            },
            performance: {
                averageJobDuration: Math.round(avgDuration),
                activeContexts: this.metrics.activeContexts,
                totalContextsCreated: this.metrics.totalContextsCreated
            },
            reliability: {
                browserRestarts: this.metrics.browserRestarts,
                recentErrors: this.metrics.errors.slice(-5) // Last 5 errors
            },
            throughput: {
                jobsPerSecond: uptime > 0 ? (this.metrics.jobsCompleted / (uptime / 1000)).toFixed(2) : 0
            }
        };
    }

    logMetrics() {
        const metrics = this.getMetrics();
        logger.info('📊 System Metrics:', metrics);
    }

    reset() {
        // Reset counters but keep historical data
        this.metrics.jobsSubmitted = 0;
        this.metrics.jobsCompleted = 0;
        this.metrics.jobsFailed = 0;
        this.metrics.browserRestarts = 0;
        this.metrics.activeContexts = 0;
        this.metrics.totalContextsCreated = 0;
        this.metrics.jobDurations = [];
        this.metrics.errors = [];
        this.startTime = Date.now();
    }
}