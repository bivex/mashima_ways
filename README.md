# mashima_ways

High-throughput web scraping service built with Patchright/Playwright. Scrapes sites at scale without getting banned.

## 🚀 Performance

**Real-world tested results:**

| Metric | Value |
|--------|-------|
| **Throughput** | 32.96 URLs/sec (118,665 URLs/hour) |
| **Concurrency** | 80 parallel contexts |
| **Success Rate** | 100% (real websites) |
| **Avg Response** | 1.3 seconds |
| **P95 Latency** | 1.8 seconds |
| **Timeout** | 10 seconds |

**Full Load Test (80 parallel URLs):**
- Total time: 2.43 seconds
- Completed: 80/80 (100%)
- All requests finished in < 2.5 seconds
- 97.5% of requests completed in 1-2 seconds

## What it does

- Run 80-200 scraping jobs concurrently
- Browser pool management with crash recovery
- Stealth mode to avoid detection (20 anti-detection techniques)
- CLI for job submission and monitoring
- Resource blocking (images, CSS, fonts, analytics) - 70% faster
- Adaptive monitoring - 36% less overhead

## Quick start

```bash
# Install
npm install
npx playwright install chromium

# Run single browser scraper
npm run scrape:single

# Run with memory limits
npm run scrape:safe

# Profile performance
npm run profile:cpu
```

## Usage

### Single Browser Scraper (Fastest)

```javascript
import { PlaywrightBrowserAdapter } from './src/infrastructure/adapters/PlaywrightBrowserAdapter.js';
import { SingleBrowserManager } from './src/domain/services/SingleBrowserManager.js';
import { BrowserConfig } from './src/domain/value-objects/BrowserConfig.js';

const adapter = new PlaywrightBrowserAdapter();
const browserManager = new SingleBrowserManager(adapter, {
    contextsPerCore: 8  // 80 contexts total
});

const config = BrowserConfig.forMaximumSpeed();  // Aggressive optimization
await browserManager.initialize(config);

const urls = ['https://example.com', 'https://httpbin.org'];
for (const url of urls) {
    const { contextId, context } = await browserManager.acquireContext(url);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.close();
    browserManager.releaseContext(contextId);
}

await browserManager.shutdown();
```

### CLI (Job Scheduler)

```bash
# Submit a job
npm start -- submit "https://example.com"

# Check status
npm start -- status

# Interactive mode
npm start
# > submit https://google.com
# > status
# > exit
```

## Performance Optimization

### Configurations

| Config | Use Case | Features |
|--------|----------|----------|
| `BrowserConfig.default()` | Standard | Balanced performance/resources |
| `BrowserConfig.forSingleBrowserArchitecture()` | Single browser | 40 contexts, resource blocking |
| `BrowserConfig.forMaximumSpeed()` | **Max throughput** | 80 contexts, 10s timeout, aggressive blocking |
| `BrowserConfig.forStaticScraping()` | Static pages | JavaScript disabled |

### Concurrency Settings

```javascript
// Conservative: 40 contexts (10 cores × 4)
new SingleBrowserManager(adapter, { contextsPerCore: 4 });

// **Aggressive: 80 contexts (10 cores × 8)** - Proven at 32 URLs/sec
new SingleBrowserManager(adapter, { contextsPerCore: 8 });

// Maximum: 120 contexts (if RAM allows)
new SingleBrowserManager(adapter, { contextsPerCore: 12 });
```

## NPM Scripts

```bash
# Scraper commands
npm run scrape:single     # Single browser scraper
npm run scrape:safe        # With memory limits

# Profiling
npm run profile            # Basic performance test
npm run profile:cpu        # CPU profiling with analysis
npm run profile:deep       # Deep performance analysis
npm run test:caching      # Validate stealth caching

# macOS profiling
npm run profile:macos      # Interactive CLI profiler
npm run profile:instruments # Open Xcode Instruments
npm run profile:all        # Run all profiling tools
```

## Performance Benchmarks

### Real Website Results

| Site | Time | Success |
|------|------|---------|
| Wikipedia | 427ms | ✅ |
| Reddit | 619ms | ✅ |
| StackOverflow | 1,129ms | ✅ |
| HackerNews | 1,269ms | ✅ |
| GitHub | 3,062ms | ✅ |

### Throughput Scaling

```
┌──────────────────────────────────────────────────────┐
│  SCALE ANALYSIS (80 contexts)                      │
├──────────────────────────────────────────────────────┤
│  10 seconds:    ~330 URLs                          │
│  1 minute:       ~1,978 URLs                        │
│  10 minutes:     ~19,780 URLs                       │
│  1 hour:         ~118,665 URLs                      │
│  24 hours:       ~2,847,960 URLs (2.8 million!)    │
└──────────────────────────────────────────────────────┘
```

## Config

Environment variables:

```bash
# Browser settings
export BROWSER_POOL_SIZE=1          # Single browser mode
export MAX_CONTEXTS_PER_BROWSER=80  # Max contexts
export GLOBAL_MAX_CONCURRENCY=250    # Global semaphore
export JOB_TIMEOUT=10000            # 10 second timeout
export CONTEXTS_PER_CORE=8           # Aggressive concurrency
```

Edit `config/default.js` for persistent configuration.

## Requirements

- Node.js 18+
- 4GB+ RAM (8GB+ recommended for 80 contexts)
- macOS/Linux (for file descriptor limits)

## Project Structure

```
src/
├── domain/        # Core entities and business logic
│   ├── services/   # SingleBrowserManager, StealthManager, etc.
│   └── value-objects/  # BrowserConfig, etc.
├── application/   # Use cases and services
│   └── services/   # ScrapingApplicationService, JobScheduler
├── infrastructure/ # Adapters and interfaces
│   ├── adapters/   # PlaywrightBrowserAdapter
│   └── interfaces/  # ConfigLoader, Logger
└── presentation/  # CLI
    └── cli.js

test/               # Performance tests and validation
tools/              # Profiling and analysis tools
docs/               # Profiling guides and optimization results
```

## Optimization Features

### ✅ Already Implemented

- **StealthManager Caching** - Prevents redundant stealth application (5-10% faster)
- **Adaptive Resource Monitoring** - Reduces monitoring overhead by 36%
- **Aggressive Resource Blocking** - Blocks images, CSS, fonts, websockets, analytics
- **Connection Pooling** - max-connections-per-host=100
- **Fast Timeout** - 10s instead of 30s
- **domcontentloaded Wait** - Don't wait for networkidle
- **80 Context Concurrency** - Proven at 32.96 URLs/sec

### Documentation

- [`docs/OPTIMIZATION_COMPLETE.md`](docs/OPTIMIZATION_COMPLETE.md) - Full optimization summary
- [`docs/IDLE_MINIMIZATION.md`](docs/IDLE_MINIMIZATION.md) - Idle reduction strategies
- [`docs/REAL_SITE_TEST_RESULTS.md`](docs/REAL_SITE_TEST_RESULTS.md) - Real website benchmarks
- [`docs/PROFILING_ANALYSIS_SUMMARY.md`](docs/PROFILING_ANALYSIS_SUMMARY.md) - calc-mcp analysis results
- [`docs/CHROME_VMMAP_ANALYSIS.md`](docs/CHROME_VMMAP_ANALYSIS.md) - Memory profiling via vmmap
- [`docs/INSTRUMENTS_PROFILING_GUIDE.md`](docs/INSTRUMENTS_PROFILING_GUIDE.md) - Xcode Instruments tutorial
- [`docs/CHROME_MEMORY_LIMITS_MACOS.md`](docs/CHROME_MEMORY_LIMITS_MACOS.md) - Memory limits on macOS

## License

MIT
