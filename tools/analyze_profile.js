import fs from 'fs';

// Get the profile file
const profileFiles = fs.readdirSync('.').filter(f => f.endsWith('.cpuprofile'));

if (profileFiles.length === 0) {
    console.error('No cpuprofile files found!');
    process.exit(1);
}

const profilePath = profileFiles[0];
console.log(`\n🔍 Analyzing: ${profilePath}\n`);

const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

// Build a map of nodes
const nodes = new Map();
profile.nodes.forEach(n => nodes.set(n.id, n));

// Calculate total time per function
const functionTimes = new Map();
let totalTime = 0;

profile.nodes.forEach(node => {
    const name = node.callFrame.functionName || '(anonymous)';
    const url = node.callFrame.url || '';
    const key = `${name}@${url}`;

    if (!functionTimes.has(key)) {
        functionTimes.set(key, { name, url, hits: 0, self: 0 });
    }

    functionTimes.get(key).hits += (node.hitCount || 0);
    totalTime += (node.hitCount || 0);
});

// Sort by hits
const sorted = [...functionTimes.values()]
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 40);

console.log('═══════════════════════════════════════════════════');
console.log('         TOP 40 FUNCTIONS BY EXECUTION COUNT');
console.log('═══════════════════════════════════════════════════\n');

// Group by category
const categories = {
    'V8 Internal': [],
    'Node Internal': [],
    'User Code': [],
    'Playwright/Chrome': []
};

sorted.forEach(fn => {
    if (fn.url.startsWith('node:')) {
        categories['Node Internal'].push(fn);
    } else if (!fn.url || fn.url === '') {
        categories['V8 Internal'].push(fn);
    } else if (fn.url.includes('node_modules') || fn.url.includes('playwright') || fn.url.includes('patchright')) {
        categories['Playwright/Chrome'].push(fn);
    } else {
        categories['User Code'].push(fn);
    }
});

for (const [category, functions] of Object.entries(categories)) {
    if (functions.length === 0) continue;

    console.log(`\n${category}:`);
    console.log('─'.repeat(60));

    functions.slice(0, 10).forEach((fn, i) => {
        const pct = ((fn.hits / totalTime) * 100).toFixed(2);
        let shortUrl = fn.url;
        if (shortUrl.length > 45) {
            shortUrl = '...' + shortUrl.slice(-42);
        }
        if (!shortUrl) shortUrl = '(internal)';

        console.log(`  ${fn.hits.toString().padStart(8)} hits (${pct.padStart(5)}%) | ${fn.name.padEnd(25)}`);
        if (fn.url && fn.url.length > 0) {
            console.log(`                                      └─ ${shortUrl}`);
        }
    });
}

console.log(`\n═══════════════════════════════════════════════════`);
console.log(`Total samples: ${totalTime}`);
console.log(`═══════════════════════════════════════════════════\n`);

// Find user code files
console.log('USER CODE FILES HIT:');
console.log('─'.repeat(60));
const userFiles = new Map();
sorted.forEach(fn => {
    if (fn.url && fn.url.includes('mashima_ways') && !fn.url.includes('node_modules')) {
        userFiles.set(fn.url, (userFiles.get(fn.url) || 0) + fn.hits);
    }
});
[...userFiles.entries()].sort((a, b) => b[1] - a[1]).forEach(([file, hits]) => {
    const pct = ((hits / totalTime) * 100).toFixed(2);
    console.log(`  ${hits.toString().padStart(8)} hits (${pct.padStart(5)}%) | ${file}`);
});

console.log('\n');
