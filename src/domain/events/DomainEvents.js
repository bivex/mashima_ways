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

export class DomainEvent {
    constructor(eventType, aggregateId, data = {}) {
        this.eventType = eventType;
        this.aggregateId = aggregateId;
        this.data = data;
        this.timestamp = new Date();
    }
}

export class JobCompleted extends DomainEvent {
    constructor(jobId, result) {
        super('JobCompleted', jobId, {result});
    }
}

export class JobFailed extends DomainEvent {
    constructor(jobId, error) {
        super('JobFailed', jobId, {error: error.message});
    }
}

export class JobCanceled extends DomainEvent {
    constructor(jobId) {
        super('JobCanceled', jobId);
    }
}

export class BrowserCrashed extends DomainEvent {
    constructor(browserId, affectedJobs) {
        super('BrowserCrashed', browserId, {affectedJobs});
    }
}

export class BrowserRestarted extends DomainEvent {
    constructor(browserId) {
        super('BrowserRestarted', browserId);
    }
}

export class ContextCreated extends DomainEvent {
    constructor(contextId, browserId, jobId) {
        super('ContextCreated', contextId, {browserId, jobId});
    }
}

export class ContextClosed extends DomainEvent {
    constructor(contextId, browserId, jobId) {
        super('ContextClosed', contextId, {browserId, jobId});
    }
}

export class JobQueued extends DomainEvent {
    constructor(jobId, url) {
        super('JobQueued', jobId, {url: url.toString()});
    }
}

export class JobStarted extends DomainEvent {
    constructor(jobId, browserId) {
        super('JobStarted', jobId, {browserId});
    }
}