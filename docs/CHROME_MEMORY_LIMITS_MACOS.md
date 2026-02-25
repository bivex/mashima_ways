# Limiting Chrome Memory on macOS (cgroups Alternative)

## Problem: Chrome Can Consume Unlimited Memory

Unlike Linux with cgroups, macOS has limited process control. Here are your options:

---

## Option 1: Playwright/Puppeteer Configuration (Recommended)

Chrome has built-in memory limits you can set via flags:

### Add to BrowserConfig

```javascript
// In your BrowserConfig value object
static forSingleBrowserArchitecture() {
    return new BrowserConfig({
        headless: true,
        // Memory limits
        args: [
            // Hard limit: Chrome will crash if exceeded
            '--js-flags=--max_old_space_size=512',  // V8 heap limit in MB

            // Soft limits: Chrome will try to stay under
            '--memory-pressure-off',
            '--disable-dev-shm-usage',  // Don't use /dev/shm
            '--disable-gpu',             // Disable GPU (saves 100-200MB)
            '--disable-software-rasterizer',
            '--single-process',          // Single process (WARNING: unstable)

            // Aggressive garbage collection
            '--gc-global',
            '--no-sandbox',
        ]
    });
}
```

### Memory Flag Reference

| Flag | Description | Recommended Value |
|------|-------------|-------------------|
| `--max_old_space_size` | Max V8 heap (per process) | 512-1024 MB |
| `--max_new_space_size` | New generation heap | 32-64 MB |
| `--memory-optimizer` | Enable memory optimizer | Always |
| `--memory-pressure-off` | Disable pressure handling | For containers |

---

## Option 2: Node.js Memory Limits

Your Node.js process also needs limits:

```bash
# Run scraper with heap limit
node --max-old-space-size=512 \
     --max-new-space-size=32 \
     examples/single_browser_scraper.js
```

Or in npm script:

```json
{
  "scripts": {
    "scrape-safe": "node --max-old-space-size=512 examples/single_browser_scraper.js"
  }
}
```

---

## Option 3: Wrapper Script with Monitor

Create a monitor that kills Chrome if it exceeds limits:

```javascript
// tools/memory-limiter.js
import { execSync } from 'child_process';
import psList from 'ps-list'; // npm install ps-list

const MAX_MEMORY_MB = 2000;
const CHECK_INTERVAL_MS = 5000;

async function monitorChrome() {
    while (true) {
        const processes = await psList();

        const chromeProcesses = processes.filter(p =>
            p.name.includes('Chrome') && p.name.includes('Helper')
        );

        for (const proc of chromeProcesses) {
            const memMb = proc.mem / 1024 / 1024;

            if (memMb > MAX_MEMORY_MB) {
                console.warn(`⚠️ Chrome PID ${proc.pid} using ${memMb}MB, killing...`);
                process.kill(proc.pid, 'SIGKILL');
            }
        }

        await new Promise(r => setTimeout(r, CHECK_INTERVAL_MS));
    }
}

monitorChrome().catch(console.error);
```

Run in parallel:
```bash
node tools/memory-limiter.js & node examples/single_browser_scraper.js
```

---

## Option 4: launchd with Resource Limits (macOS Native)

macOS `launchd` can set resource limits via plist:

```xml
<!-- ~/Library/LaunchAgents/com.scraper.memorylimits.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.scraper.memorylimits</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Volumes/External/Code/mashima_ways/examples/single_browser_scraper.js</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <!-- Soft limit: Process will get warnings -->
    <key>SoftResourceLimits</key>
    <dict>
        <key>Memory</key>
        <integer>2147483648</integer> <!-- 2GB in bytes -->
    </dict>

    <!-- Hard limit: Process will be killed -->
    <key>HardResourceLimits</key>
    <dict>
        <key>Memory</key>
        <integer>3221225472</integer> <!-- 3GB in bytes -->
    </dict>

    <key>StandardOutPath</key>
    <string>/tmp/scraper.log</string>

    <key>StandardErrorPath</key>
    <string>/tmp/scraper.err</string>
</dict>
</plist>
```

Load it:
```bash
ln -s ~/Library/LaunchAgents/com.scraper.memorylimits.plist \
   ~/Library/LaunchAgents/

launchctl load ~/Library/LaunchAgents/com.scraper.memorylimits.plist
launchctl start com.scraper.memorylimits
```

---

## Option 5: Docker with Memory Limits (Best for Production)

Run your scraper in a Docker container with real memory limits:

```dockerfile
FROM node:18-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    wget gnupg \
    && rm -rf /var/lib/apt/lists/*

# Set memory limits via ENV (used by Node.js)
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV PUPPETEER_MEMORY_LIMIT_MB=512

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

CMD ["node", "examples/single_browser_scraper.js"]
```

Run with memory limit:
```bash
docker run --rm \
  --memory="2g" \
  --memory-swap="2g" \
  --memory-reservation="1g" \
  --name scraper \
  scraper:latest
```

---

## Option 6: Custom Memory Monitor in Your Code

Add monitoring directly to your scraper:

```javascript
// Add to SingleBrowserManager or your main class
class MemoryMonitor {
    constructor(maxMemoryMb = 2000) {
        this.maxMemoryMb = maxMemoryMb;
        this.checkInterval = null;
    }

    start() {
        this.checkInterval = setInterval(() => {
            const memUsage = process.memoryUsage();
            const heapMb = memUsage.heapUsed / 1024 / 1024;
            const rssMb = memUsage.rss / 1024 / 1024;

            if (rssMb > this.maxMemoryMb) {
                console.error(`⚠️ Memory limit exceeded: ${rssMb}MB`);
                console.error('   Forcing garbage collection...');

                if (global.gc) {
                    global.gc();
                } else {
                    console.warn('   Run with --expose-gc to enable GC');
                }

                // If still too high, shutdown
                const afterRss = process.memoryUsage().rss / 1024 / 1024;
                if (afterRss > this.maxMemoryMb) {
                    console.error('   Still over limit, forcing shutdown');
                    process.exit(1);
                }
            }
        }, 5000);
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
}

// Usage
const monitor = new MemoryMonitor(2000); // 2GB limit
monitor.start();

// ... your scraping logic ...

monitor.stop();
```

Run with GC exposed:
```bash
node --expose-gc examples/single_browser_scraper.js
```

---

## Recommended Strategy for Your Scraper

Combine multiple approaches:

```javascript
// 1. Browser config with limits
const config = BrowserConfig.forSingleBrowserArchitecture();
config.args.push('--js-flags=--max_old_space_size=512');

// 2. Process memory monitor
const monitor = new MemoryMonitor(2000);
monitor.start();

// 3. Context rotation to prevent buildup
// (Already in your code: every 50 pages)

// 4. Resource blocking
// (Already in your code: images, css, fonts blocked)

// 5. Graceful degradation
if (rssMb > warningThreshold) {
    // Reduce concurrency
    browserManager.setMaxContexts(currentMax / 2);
}
```

---

## Quick Reference: Set Limits Now

```bash
# For immediate testing with limits
node --expose-gc \
     --max-old-space-size=512 \
     examples/single_browser_scraper.js

# Or with Chrome V8 limit
CHROME_FLAGS="--js-flags=--max_old_space_size=256" \
node --max-old-space-size=512 \
examples/single_browser_scraper.js
```

---

## Verification

Check if limits are working:

```javascript
// In your scraper
setInterval(() => {
    const usage = process.memoryUsage();
    console.log({
        heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
        external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
    });
}, 10000);
```

If RSS stays below your limit, it's working!
