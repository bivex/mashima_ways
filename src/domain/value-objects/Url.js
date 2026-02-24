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

export class Url {
    constructor(value) {
        if (!value || typeof value !== 'string') {
            throw new Error('URL must be a non-empty string');
        }

        try {
            new URL(value); // Validate URL format
            this.value = value;
        } catch (error) {
            throw new Error(`Invalid URL format: ${value}`);
        }
    }

    toString() {
        return this.value;
    }

    equals(other) {
        return other instanceof Url && other.value === this.value;
    }
}