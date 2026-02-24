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

export class JobResult {
    constructor({success, data, error, duration, timestamp = new Date()}) {
        this.success = Boolean(success);
        this.data = data;
        this.error = error;
        this.duration = duration; // in milliseconds
        this.timestamp = timestamp;
    }

    static success(data, duration) {
        return new JobResult({success: true, data, duration});
    }

    static failure(error, duration) {
        return new JobResult({success: false, error, duration});
    }

    isSuccess() {
        return this.success;
    }

    isFailure() {
        return !this.success;
    }
}