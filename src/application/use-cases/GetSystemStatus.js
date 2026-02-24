/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-24 23:50
 * Last Updated: 2026-02-24 23:50
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

export class GetSystemStatus {
    constructor(jobScheduler, browserPoolManager) {
        this.jobScheduler = jobScheduler;
        this.browserPoolManager = browserPoolManager;
    }

    async execute() {
        const browserStats = this.browserPoolManager.getBrowserStats();

        return {
            timestamp: new Date(),
            browsers: browserStats.browsers,
            activeSessions: this.jobScheduler.getActiveSessionsCount(),
            queuedJobs: this.jobScheduler.getQueuedJobsCount(),
            globalConcurrency: {
                active: browserStats.totalActiveJobs,
                max: browserStats.globalMaxConcurrency
            }
        };
    }
}