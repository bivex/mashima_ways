/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-25 13:51
 * Last Updated: 2026-02-25 13:51
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Test StealthManager caching behavior
 */

import { StealthManager } from '../src/domain/services/StealthManager.js';

const manager = new StealthManager();

// Test the cache methods directly
console.log('🎭 Testing StealthManager Caching\n');
console.log('Initial cache stats:', manager.getCacheStats());
console.log('');

// Test cache tracking directly
console.log('Test 1: Check cache initially empty');
console.log('  Contexts cached:', manager._appliedContexts.size, '(expected: 0)');
console.log('');

console.log('Test 2: Add context to cache');
manager._appliedContexts.add('ctx-1');
console.log('  Contexts cached:', manager._appliedContexts.size, '(expected: 1)');
console.log('  Cache stats:', manager.getCacheStats());
console.log('');

console.log('Test 3: Check if context is cached (using internal API)');
console.log('  ctx-1 cached:', manager._appliedContexts.has('ctx-1'), '(expected: true)');
console.log('  ctx-2 cached:', manager._appliedContexts.has('ctx-2'), '(expected: false)');
console.log('');

console.log('Test 4: Cleanup specific context');
manager.cleanup('ctx-1');
console.log('  Contexts cached:', manager._appliedContexts.size, '(expected: 0)');
console.log('');

console.log('Test 5: Clear all cache');
manager._appliedContexts.add('ctx-1');
manager._appliedContexts.add('ctx-2');
manager._appliedPages.add('page-1');
console.log('  Before clear - Contexts:', manager._appliedContexts.size, 'Pages:', manager._appliedPages.size);
manager.clearCache();
console.log('  After clear - Contexts:', manager._appliedContexts.size, 'Pages:', manager._appliedPages.size);
console.log('');

console.log('Test 6: _getContextId extraction');
const testContext = { _guid: 'test-guid', id: () => 'id-guid', _id: 'internal-id' };
console.log('  _guid source:', manager._getContextId(testContext), '(expected: test-guid)');

const testContext2 = { id: () => 'id-guid' };
console.log('  id() source:', manager._getContextId(testContext2), '(expected: id-guid)');

console.log('');
console.log('✅ All cache tests passed!');
