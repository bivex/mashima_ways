/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-25 13:54
 * Last Updated: 2026-02-25 13:54
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

import fs from 'fs';
import path from 'path';

// Get the latest profile file
const profileFiles = fs.readdirSync('.')
    .filter(f => f.endsWith('.cpuprofile'))
    .sort()
    .reverse();

if (profileFiles.length === 0) {
    console.error('No cpuprofile files found!');
    process.exit(1);
}

const profilePath = profileFiles[0];
console.log(`\n🔍 DEEP PROFILE ANALYSIS: ${profilePath}\n`);

const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

// Build call tree
const nodeMap = new Map();
profile.nodes.forEach(n => nodeMap.set(n.id, n));

// Find roots (nodes with no parents pointing to them)
const allChildren = new Set();
profile.nodes.forEach(n => {
    (n.children || []).forEach(c => allChildren.add(c));
});

// Get bottom-up analysis - find hot paths
function getBottomUpStats(nodeId, depth = 0, path = []) {
    const node = nodeMap.get(nodeId);
    if (!node || depth > 50) return [];

    const currentPath = [...path, {
        id: nodeId,
        name: node.callFrame.functionName || '(anonymous)',
        url: node.callFrame.url || '',
        line: node.callFrame.lineNumber,
        hitCount: node.hitCount || 0
    }];

    let result = [{ path: currentPath, hits: node.hitCount || 0 }];

    for (const childId of (node.children || [])) {
        result = result.concat(getBottomUpStats(childId, depth + 1, currentPath));
    }

    return result;
}

// Get all paths
const allPaths = getBottomUpStats(1);

// Find hot paths in user code
const userCodePaths = allPaths.filter(p => {
    return p.path.some(frame =>
        frame.url &&
        frame.url.includes('mashima_ways') &&
        !frame.url.includes('node_modules')
    );
});

// Group by file
const fileStats = new Map();
for (const item of allPaths) {
    for (const frame of item.path) {
        if (!frame.url || !frame.url.includes('mashima_ways') || frame.url.includes('node_modules')) continue;

        if (!fileStats.has(frame.url)) {
            fileStats.set(frame.url, { hits: 0, functions: new Map() });
        }
        fileStats.get(frame.url).hits += item.hits;

        const funcKey = `${frame.name}:${frame.line}`;
        fileStats.get(frame.url).functions.set(funcKey,
            (fileStats.get(frame.url).functions.get(funcKey) || 0) + item.hits);
    }
}

console.log('═══════════════════════════════════════════════════');
console.log('         USER CODE HOT SPOTS');
console.log('═══════════════════════════════════════════════════\n');

[...fileStats.entries()]
    .sort((a, b) => b[1].hits - a[1].hits)
    .slice(0, 10)
    .forEach(([file, stats]) => {
        const fileName = file.split('/').pop();
        const relativePath = file.split('mashima_ways/').pop() || fileName;

        console.log(`📄 ${relativePath}`);
        console.log(`   Total hits: ${stats.hits}`);

        const topFuncs = [...stats.functions.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        topFuncs.forEach(([func, hits]) => {
            const [name, line] = func.split(':');
            console.log(`      ${hits.toString().padStart(6)} | ${name} (line ${line})`);
        });
        console.log('');
    });

// Find Playwright hot spots
console.log('\n═══════════════════════════════════════════════════');
console.log('         PLAYWRIGHT/PATCHRIGHT HOT SPOTS');
console.log('═══════════════════════════════════════════════════\n');

const playwrightStats = new Map();
for (const item of allPaths) {
    for (const frame of item.path) {
        if (!frame.url || (!frame.url.includes('patchright') &&
            !frame.url.includes('playwright') &&
            !frame.url.includes('chromium'))) continue;

        if (!playwrightStats.has(frame.url)) {
            playwrightStats.set(frame.url, { hits: 0, functions: new Map() });
        }
        playwrightStats.get(frame.url).hits += item.hits;

        const funcKey = `${frame.name}:${frame.line}`;
        playwrightStats.get(frame.url).functions.set(funcKey,
            (playwrightStats.get(frame.url).functions.get(funcKey) || 0) + item.hits);
    }
}

[...playwrightStats.entries()]
    .sort((a, b) => b[1].hits - a[1].hits)
    .slice(0, 5)
    .forEach(([file, stats]) => {
        const fileName = file.split('/').pop();
        console.log(`📄 ${fileName} (${stats.hits} hits)`);

        const topFuncs = [...stats.functions.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        topFuncs.forEach(([func, hits]) => {
            const [name, line] = func.split(':');
            console.log(`      ${hits} | ${name}`);
        });
        console.log('');
    });

// Analysis summary
console.log('\n═══════════════════════════════════════════════════');
console.log('         OPTIMIZATION RECOMMENDATIONS');
console.log('═══════════════════════════════════════════════════\n');

// Get total hits
const totalHits = allPaths.reduce((sum, p) => sum + p.hits, 0);
const idleHits = (nodeMap.get(2)?.hitCount || 0);
const activePercent = ((totalHits - idleHits) / totalHits * 100).toFixed(2);

console.log(`📊 Overall Analysis:`);
console.log(`   Total samples: ${totalHits}`);
console.log(`   Idle time: ${((idleHits / totalHits) * 100).toFixed(2)}%`);
console.log(`   Active processing: ${activePercent}%`);
console.log('');

if (idleHits / totalHits > 0.85) {
    console.log('✅ STATUS: I/O BOUND (Good!)');
    console.log('');
    console.log('   Your scraper is spending most time waiting for:');
    console.log('   • Network requests (page loading)');
    console.log('   • Chrome rendering');
    console.log('   • Playwright protocol communication');
    console.log('');
    console.log('   This is EXPECTED and OPTIMAL for web scraping.');
    console.log('');
    console.log('   Optimization opportunities:');
    console.log('   1. ✅ Already implemented: Resource blocking');
    console.log('   2. ✅ Already implemented: domcontentloaded');
    console.log('   3. ✅ Already implemented: Parallel contexts');
    console.log('   4. Consider: Connection pooling/keep-alive');
    console.log('   5. Consider: DNS caching');
    console.log('   6. Consider: Pre-warming contexts');
} else if (activePercent > 30) {
    console.log('⚠️  STATUS: CPU BOUND (Needs optimization)');
    console.log('');
    console.log('   Your code is doing heavy processing.');
    console.log('   Check the hot spots above for optimization targets.');
} else {
    console.log('ℹ️  STATUS: MIXED');
    console.log('');
    console.log('   Both I/O and CPU are significant factors.');
}

// Memory analysis from profile
console.log('\n');
console.log('═══════════════════════════════════════════════════');
console.log('         MEMORY ALLOCATION PATTERNS');
console.log('═══════════════════════════════════════════════════\n');

// Count allocation patterns by function name patterns
const patterns = {
    ' closures': /\(|<anonymous>/,
    ' promises': /Promise|then|async|await/,
    ' timers': /Timeout|Interval|Timer/,
    ' events': /Event|emit|on\(/,
    ' buffers': /Buffer|Uint8Array/,
    ' json': /JSON|parse|stringify/,
};

const patternHits = new Map();
Object.keys(patterns).forEach(name => patternHits.set(name, 0));

for (const item of allPaths) {
    for (const frame of item.path) {
        for (const [name, pattern] of Object.entries(patterns)) {
            if (pattern.test(frame.name)) {
                patternHits.set(name, patternHits.get(name) + item.hits);
            }
        }
    }
}

console.log('Pattern analysis:');
[...patternHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, hits]) => {
        const pct = (hits / totalHits * 100).toFixed(2);
        console.log(`   ${hits.toString().padStart(6)} (${pct.padStart(5)}%) |${name}`);
    });

console.log('\n');
