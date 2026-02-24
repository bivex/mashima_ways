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

import {Job} from '../entities/Job.js';
import {BrowserContext} from '../entities/BrowserContext.js';

export class ScrapingSession {
    constructor(job, context) {
        if (!(job instanceof Job)) {
            throw new Error('Job must be a valid Job instance');
        }
        if (!(context instanceof BrowserContext)) {
            throw new Error('Context must be a valid BrowserContext instance');
        }

        this.job = job;
        this.context = context;
        this.sessionId = `${job.id}-${context.id}`;
    }

    get id() {
        return this.sessionId;
    }

    isActive() {
        return this.job.isRunning() && this.context.isActive();
    }

    isCompleted() {
        return this.job.isCompleted() || this.job.isFailed();
    }
}