# Memory Profiling Chrome Scraper on macOS with Xcode Instruments

## Quick Setup Guide

### Step 1: Prepare Your Script for Profiling

Modify your scraper to run longer and generate more load:

```javascript
// Add this to your test script
const longRunningUrls = Array(100).fill('https://example.com');
// This gives Instruments enough data to capture patterns
```

### Step 2: Launch Instruments

```bash
# Open Instruments
open -a "Instruments"
```

Or from Xcode:
```
Xcode → Open Developer Tool → Instruments
```

### Step 3: Choose Allocations Template

1. Select **Allocations** instrument
2. Click **Choose Target**
3. Look for "Google Chrome Helper (Renderer)" processes
4. **Pro Tip**: Choose the one with highest CPU usage (active tab)

### Step 4: Generation Analysis Technique

This is the most powerful feature for identifying leaks:

1. Start recording in Instruments
2. Run your scraper
3. After 10 pages, click **Mark Generation** (button at bottom)
4. Let it process 50 more pages
5. Click **Mark Generation** again
6. Stop recording

**What to look for:**
- Objects created in Gen 1 that persist into Gen 2 = potential leak
- Look for "VM Region" and "Dirty Memory" growth
- Check "All Heap & Anonymous VM" for overall trend

### Step 5: Key Metrics to Monitor

| Metric | What It Means | Good Range |
|--------|---------------|------------|
| **All Heap** | JavaScript objects | Should stabilize |
| **Dirty Size** | Non-swappable memory | Watch for growth |
| **Anonymous VM** | Malloc'd memory | Should be stable |
| **CG backing stores** | Image/canvas buffers | Block these! |

### Step 6: Call Tree Analysis

1. Click the **Call Tree** button
2. Check these checkboxes:
   - [x] Separate by Thread
   - [x] Invert Call Tree
   - [x] Hide System Libraries

3. Look for:
   - `page.evaluate()` calls creating large objects
   - Array growth in scraping logic
   - Event listeners not being removed

## Example: Finding a Leak

```
Problem: Memory grows 10MB per 100 pages

Instruments shows:
  Gen 1: 50MB baseline
  Gen 2 (after 100 pages): 1.2GB (!!)

Call Tree reveals:
  800MB → [JavaScript] parseData
         → Array.push() ← Storing all results in memory!

Solution: Stream results to disk instead of array
```

## Chrome-Specific Memory Areas

When profiling Chrome, you'll see these categories:

1. **V8 Heap** - JavaScript objects
   - DOM nodes
   - Scraped data
   - Closure references

2. **GPU Memory** - Rendering buffers
   - Canvas/bitmaps
   - Should be minimal with resource blocking

3. **Compressed Memory** - macOS swap
   - High values = system swapping to SSD

4. **Wired Memory** - Kernel-resident
   - Browser executable
   - Should be stable

## Automating with command-line

```bash
# Find Chrome renderer PID
pgrep -f "Chrome Helper.*Renderer"

# Attach Instruments from command line
instruments -t "Allocations" -D chrome_profile.trace \
  -p $(pgrep -f "Chrome Helper.*Renderer")

# Then run your scraper in another terminal
```

## Interpreting Results

### Memory Leak Pattern
```
Steady climb without plateaus
     │
 1GB │                    ╱───────
     │              ╱────╱
     │        ╱────╱
     │  ╱────╱
 0GB │─────────────────────> Time
```

### Healthy Pattern
```
Sawtooth with cleanup
     │
500M │    ╱╲    ╱╲    ╱╲
     │   ╱  ╲  ╱  ╲  ╱  ╲
     │  ╱    ╲╱    ╲╱    ╲
 0GB │─────────────────────> Time
```

## Pro Tips

1. **Use Generation Analysis** - It filters out noise and shows only new allocations
2. **Profile with realistic load** - 100+ pages minimum
3. **Check both processes** - Profile both browser and renderer
4. **Correlate with logs** - Add memory logging to your code
5. **Baseline first** - Profile empty run to establish baseline

## Additional Tools

### VM Tracker
Use alongside Allocations to see swap usage:
```
High "Swap Size" = macOS is compressing memory to SSD
This = Performance death knell
```

### Time Profiler
For CPU-bound memory issues:
```
High CPU + Growing memory = Infinite loop creating objects
```

## Integration with Your Scraper

Add memory markers in your code:

```javascript
console.log('PROFILE: page-start');
await page.goto(url);
console.log('PROFILE: page-end');
await page.close();
console.log('PROFILE: page-closed');
```

Then correlate timestamps in Instruments with your console output.

## Common Issues Found

1. **Result accumulation** - Not streaming scraped data
2. **Event listeners** - Not removing page listeners
3. **Context leaks** - Not closing browser contexts
4. **Cache buildup** - Not clearing browser caches
5. **Screenshot buffers** - Accumulating in memory
