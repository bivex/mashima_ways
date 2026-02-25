# Practical Memory Profiling Workflow for Chrome Scraper

## Complete Step-by-Step Guide

This guide shows you exactly how to profile your Chrome scraper on macOS to find and fix memory leaks.

---

## Phase 1: Setup (5 minutes)

### 1. Install Dependencies

```bash
# You already have these
npm install

# For advanced memory monitoring (optional)
npm install ps-list cli-table3
```

### 2. Create a Test That Generates Load

You need to process enough pages to see memory patterns:

```javascript
// test/memory_leak_test.js
import { scrapeWithMaxSpeed } from '../examples/single_browser_scraper.js';

// Generate 100 identical URLs to stress test
const testUrls = Array(100).fill('https://example.com');

console.log('🧪 Running memory leak test...');
console.log('   Pages: 100');
console.log('   This will take ~1-2 minutes\n');

const results = await scrapeWithMaxSpeed(testUrls);

console.log('\n✅ Test complete');
console.log('   Check profiling results in ./profiling-results/\n');
```

### 3. Set Memory Limits

Create a "safe" version of your scraper with limits:

```bash
# Run with memory limits
npm run scrape:safe
```

---

## Phase 2: Quick Health Check (2 minutes)

### Run the Built-in Profiler

```bash
npm run profile
```

Look for:
- Memory Delta: Should be < 20MB for 20 pages
- Heap Growth: Should be < 30%
- ⚠️ BOTTLENECK warnings

### Interpret Results

| Result | Meaning | Action |
|--------|---------|--------|
| Memory Delta < 20MB | Healthy | No action needed |
| Memory Delta 20-100MB | Minor leak | Investigate with Instruments |
| Memory Delta > 100MB | Major leak | Immediate investigation |

---

## Phase 3: Deep Dive with Instruments (15 minutes)

### Option A: Using the Script

```bash
# This opens Instruments GUI
npm run profile:instruments
```

### Option B: Manual Steps

```bash
# Terminal 1: Start your scraper with a long-running test
node --expose-gc test/memory_leak_test.js

# Terminal 2: Open Instruments
open -a "Instruments"
# File → New → Allocations → Choose
# Target: Attach to Process → Google Chrome Helper (Renderer)
```

### Key Actions in Instruments

1. **Mark Generation** (bottom button)
   - Click once at start (baseline)
   - Click again after 50 pages
   - Click again after 100 pages

2. **Look for:**
   - Objects created in Gen 1 that still exist in Gen 3
   - Growing "Anonymous VM" regions
   - "CG backing stores" (image buffers)

3. **Call Tree Analysis:**
   - Open Call Tree inspector
   - Check "Invert Call Tree"
   - Check "Hide System Libraries"
   - Look for your code paths allocating memory

---

## Phase 4: Command-Line Profiling (5 minutes)

### Run All Profiling Tools

```bash
# Terminal 1: Start scraper
npm run scrape:single

# Terminal 2: Run all profilers
npm run profile:all
```

This creates:
- `profiling-results/leaks_*.txt` - Leak detection
- `profiling-results/footprint_*.txt` - Memory breakdown
- `profiling-results/vmmap_*.txt` - Virtual memory map
- `profiling-results/zprint_*.txt` - Kernel zones

### Analyze Output

```bash
# Check for leaks
grep -i "leak" profiling-results/leaks_*.txt

# Check memory regions
grep -E "Region|Total" profiling-results/vmmap_*.txt

# Monitor over time
npm run profile:macos -- --monitor 60 5
```

---

## Phase 5: Interactive Monitoring

### Use the Interactive Menu

```bash
npm run profile:macos
```

You'll see:
```
================================================
  Profiling Options
================================================

1) Find Chrome processes
2) Run leaks detector
3) Run footprint analysis
4) Run vmmap analysis
5) Monitor memory over time
6) Open Instruments (GUI)
7) Run zprint (kernel zones)
8) Show memory summary
9) Run all non-GUI tools
0) Exit
```

### Recommended Workflow

1. Start your scraper
2. Option 1 (find processes)
3. Option 5 (monitor for 60 seconds)
4. Option 2 (run leaks)
5. Option 3 (run footprint if available)
6. Stop scraper
7. Review results in `profiling-results/`

---

## Phase 6: Common Issues & Fixes

### Issue 1: Results Array Accumulation

**Symptom:** Memory grows linearly with pages processed

**Detection (Instruments):**
```
Gen 1: 50MB
Gen 2: 500MB (!!)
Call Tree shows: Array.push() → scrapedData
```

**Fix:**
```javascript
// Don't do this:
const results = [];
for (const url of urls) {
  results.push(await scrape(url)); // Grows forever!
}

// Do this instead:
for (const url of urls) {
  const data = await scrape(url);
  await streamToDisk(data); // Write and forget
}
```

### Issue 2: Event Listeners Not Removed

**Symptom:** Sawtooth pattern that never resets

**Detection:**
```
Call Tree shows:
  page.on('response', handler) ← Called 1000 times!
  No corresponding page.off() calls
```

**Fix:**
```javascript
// Always cleanup
try {
  page.on('response', handler);
  await page.goto(url);
} finally {
  page.off('response', handler);
}
```

### Issue 3: Contexts Not Closed

**Symptom:** V8 heap grows, contexts accumulate

**Detection:**
```bash
# Check Chrome process count
pgrep -f "Chrome Helper" | wc -l
# Should be stable, not growing!
```

**Fix:**
```javascript
// Your code already does this correctly:
} finally {
  if (page) await page.close();
  if (contextId) browserManager.releaseContext(contextId);
}
```

### Issue 4: Screenshot Buffers

**Symptom:** Large "CG backing stores" in Instruments

**Fix:**
```javascript
// Disable image capture in page.goto
await page.goto(url, {
  waitUntil: 'domcontentloaded',
  timeout: 30000
});

// Don't take screenshots unless needed
// If needed, convert to buffer and stream immediately
```

### Issue 5: Chrome Itself Leaking

**Symptom:** Memory grows even when your code does nothing

**Detection:**
- Use `--single-process` flag (warning: unstable)
- Check Chrome version for known leaks
- Try Patchright vs Playwright

---

## Phase 7: Preventive Measures

### 1. Enable Memory Limits

```javascript
// Add to BrowserConfig
const config = new BrowserConfig({
  args: [
    '--js-flags=--max_old_space_size=512',
    '--disable-gpu',
    '--disable-dev-shm-usage'
  ]
});
```

### 2. Regular Context Rotation

Your code already does this (every 50 pages) - excellent!

### 3. Monitor in Production

```javascript
// Add to your scraper
setInterval(() => {
  const { rss, heapUsed } = process.memoryUsage();
  const rssMb = (rss / 1024 / 1024).toFixed(2);
  const heapMb = (heapUsed / 1024 / 1024).toFixed(2);

  console.log(`[MEM] RSS: ${rssMb}MB, Heap: ${heapMb}MB`);

  if (rss > 2 * 1024 * 1024 * 1024) { // 2GB
    console.error('[MEM] Limit exceeded, triggering cleanup...');
    global.gc?.();
  }
}, 10000);
```

### 4. Graceful Degradation

```javascript
// Reduce load if memory is high
function adjustConcurrency(memoryMb) {
  if (memoryMb > 1500) {
    return maxContexts / 2;
  } else if (memoryMb > 1000) {
    return maxContexts * 0.75;
  }
  return maxContexts;
}
```

---

## Quick Reference: Common Commands

```bash
# Quick health check
npm run profile

# Run with memory limits
npm run scrape:safe

# Find Chrome processes
pgrep -fl "Chrome Helper"

# Run leaks
sudo leaks $(pgrep -f "Chrome Helper.*Renderer" | head -1)

# Monitor memory over time
watch -n 2 'ps aux | grep -i chrome | grep -v grep'

# Check memory with footprint
sudo footprint -swappable $(pgrep -f "Chrome Helper.*Renderer" | head -1)

# Open Instruments
npm run profile:instruments

# Run full profiling suite
npm run profile:all
```

---

## Expected Results for Healthy Scraper

After profiling a healthy scraper, you should see:

```
Memory Delta:  < 50MB for 100 pages
Heap Growth:   < 40%
leaks:         0 leaks found for <unknown> module
RSS Stability: Grows then plateaus (sawtooth pattern)
Context Count: Stable, not growing
```

If you see these, your scraper is memory-healthy! 🎉

---

## Troubleshooting

### Instruments won't attach to Chrome

**Solution:**
```bash
# Disable Chrome sandbox
CHROME_ARGS='--no-sandbox' npm run scrape:single
```

### leaks command takes forever

**Solution:**
```bash
# Limit scan time
leaks -at most <pid> 10  # Scan for 10 seconds max
```

### Can't find Chrome processes

**Solution:**
```bash
# Make sure scraper is actually running
pgrep -fl node

# Look for any Chrome
ps aux | grep -i chrome
```

---

## Summary: Your New Workflow

1. **Development**: `npm run scrape:safe`
2. **Quick check**: `npm run profile`
3. **Deep dive**: `npm run profile:instruments`
4. **CLI profiling**: `npm run profile:all`
5. **Interactive**: `npm run profile:macos`

That's it! You now have complete control over Chrome memory profiling on macOS.
