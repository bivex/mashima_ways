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

import {Job} from '../../domain/entities/Job.js';

export class SubmitScrapingJob {
    constructor(jobScheduler) {
        this.jobScheduler = jobScheduler;
    }

    async execute(url, options = {}) {
        const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const job = new Job(jobId, url, options);

        await this.jobScheduler.submitJob(job);

        return {
            jobId,
            status: 'queued',
            url: url.toString(),
            options
        };
    }
}