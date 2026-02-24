# Patchright Scraping Service (DDD Architecture)

A high-throughput web scraping service built with Patchright and Chromium, designed for **controlled throughput** (
100-200 concurrent tasks) with resource efficiency and stability. Uses Domain-Driven Design (DDD) principles for clean
architecture and maintainability.

**Focus: Sustainable throughput, not maximum browser count**

## Features

- **Controlled Throughput**: 100-200 concurrent tasks with backpressure control
- **Browser Pool Management**: 4-8 Chromium processes with smart load balancing
- **BrowserContext Isolation**: Each scraping job runs in its own isolated context
- **Crash Recovery**: Automatic detection and restart of crashed browsers
- **Stealth Mode**: Patchright integration with realistic user agents and anti-detection
- **Resource Optimization**: Configurable resource blocking, timeouts, and performance flags
- **DDD Architecture**: Clean separation of concerns with domain, application, and infrastructure layers
- **Observability**: Comprehensive logging and metrics collection
- **CLI Interface**: Command-line interface for job submission and monitoring

## Architecture

### Domain Layer

- **Entities**: `Job`, `Browser`, `BrowserContext`
- **Aggregates**: `ScrapingSession`
- **Value Objects**: `Url`, `JobResult`, `BrowserConfig`
- **Domain Services**: `BrowserPoolManager`, `JobScheduler`, `EventBus`

### Application Layer

- **Use Cases**: `SubmitScrapingJob`, `GetSystemStatus`
- **Application Services**: `ScrapingService`, `BrowserPoolService`, `ScrapingApplicationService`

### Infrastructure Layer

- **Adapters**: `PlaywrightBrowserAdapter`, `InMemoryJobQueue`
- **Interfaces**: `Logger`, `MetricsCollector`, `ConfigLoader`

### Presentation Layer

- **CLI**: Interactive and command-line interfaces

## Installation

```bash
npm install
npx playwright install chromium
```

## Configuration

The service can be configured via environment variables or the `config/default.js` file:

```bash
# Browser pool settings
export BROWSER_POOL_SIZE=5
export MAX_CONTEXTS_PER_BROWSER=50
export GLOBAL_MAX_CONCURRENCY=250

# Job settings
export JOB_TIMEOUT=30000
export JOB_RETRIES=2

# Logging
export LOG_LEVEL=info
```

## Throughput Recommendations

### Resource-Aware Configuration

Instead of maximizing browser count, focus on **sustainable throughput** with your system resources:

**Starter Configuration (4-8 CPU cores, 16GB RAM):**

```javascript
browser: {
    poolSize: 4,              // 4 Chromium processes
        maxContextsPerBrowser
:
    25, // 25 contexts per process
        globalMaxConcurrency
:
    100  // 100 concurrent tasks total
}
```

*Expected: ~200-500 URLs/minute depending on page complexity*

**High-Performance Configuration (16+ CPU cores, 64GB RAM):**

```javascript
browser: {
    poolSize: 8,               // 8 Chromium processes
        maxContextsPerBrowser
:
    50,  // 50 contexts per process
        globalMaxConcurrency
:
    200   // 200 concurrent tasks total
}
```

*Expected: ~500-1000 URLs/minute depending on page complexity*

### Monitoring Commands

Check system resources before scaling:

```bash
# Memory usage
ps aux | grep chromium | awk '{sum += $6} END {print "Total RSS:", sum/1024 "MB"}'

# Open file descriptors
lsof -p $(pgrep -f chromium) | wc -l

# CPU usage
top -p $(pgrep -f chromium | tr '\n' ',' | sed 's/,$//')
```

### Scaling Guidelines

1. **Start small**: Begin with 4 processes × 25 contexts (100 concurrent tasks)
2. **Monitor health metrics**: Keep success rate >95%, p95 duration <5000ms, queue depth <50
3. **Watch system resources**: Keep RAM usage <80%, CPU <70%, file descriptors <80% of ulimit
4. **Adjust gradually**: Increase by 1 process/context at a time, monitor impact
5. **Use backpressure**: System automatically reduces load when resources are constrained
6. **Watch for bottlenecks**: Network, disk I/O, target site rate limits, or browser crashes

## Usage

### Start the Service

```bash
npm start
```

### Command Line Interface

```bash
# Submit a scraping job
npm start -- submit "https://example.com"

# Check system status
npm start -- status

# Run test with sample jobs
npm start -- test
```

### Interactive CLI

```bash
npm start
# Then use commands like:
# submit https://example.com
# status
# health
# exit
```

### Resource Monitoring & Backpressure

The service includes intelligent resource monitoring, smart backpressure, and health metrics:

- **Automatic monitoring**: CPU, memory, file descriptors every 30 seconds
- **Smart backpressure**: Reduces concurrency based on queue depth and system load
- **Health metrics**: Queue depth, success rate, p95 duration, completion statistics
- **Browser watchdog**: Automatic restart of crashed browsers
- **Resource-aware scaling**: Recommendations for optimal configuration
- **Bulletproof cleanup**: Guaranteed resource cleanup with try/finally blocks

Check system status and health:

```bash
npm start -- status
# Shows resources, health metrics, recommendations, and backpressure status
```

Health metrics include:

- **Queue depth**: Number of jobs waiting in queue
- **Success rate**: Ratio of completed to total jobs (0.0-1.0)
- **P95 duration**: 95th percentile response time in milliseconds
- **Completion stats**: Total, completed, and failed job counts

### Programmatic Usage

```javascript
import {ScrapingApplicationService} from './src/application/services/ScrapingApplicationService.js';
import {ConfigLoader} from './src/infrastructure/interfaces/ConfigLoader.js';

const config = ConfigLoader.load();
const service = new ScrapingApplicationService(config);

await service.start();

// Submit a job
const result = await service.submitJob('https://example.com', {
    timeout: 10000,
    waitUntil: 'domcontentloaded'
});

console.log('Job submitted:', result);

// Get status
const status = await service.getStatus();
console.log('System status:', status);

// Shutdown
await service.shutdown();
```

## Performance Optimizations

### Browser Launch Flags

The service uses optimized Chromium flags for headless scraping:

- `--disable-dev-shm-usage`: Prevents shared memory issues
- `--disable-gpu`: Disables GPU acceleration
- `--disable-gl-drawing-for-tests`: Optimizes rendering

### Resource Blocking

Automatically blocks unnecessary resources:

- Images, videos, fonts
- Analytics and tracking scripts

### Navigation Strategies

- `waitUntil: 'domcontentloaded'` for faster page loads
- Configurable timeouts and retry logic

## System Requirements

### Unix/Linux

- Node.js 18+
- 4GB+ RAM (scales with concurrency)
- Chromium browser (installed via Playwright)

### File Descriptors

Increase ulimit for high concurrency:

```bash
ulimit -n 10000
```

### Memory Management

- Each Chromium process: ~100-200MB base memory
- Each active context: ~10-50MB additional
- Monitor with `top` or `htop`

## Monitoring

### Logs

Structured logging with configurable levels:

- Job lifecycle events
- Browser crashes and restarts
- Performance metrics

### Metrics

Real-time metrics collection:

- Job throughput and success rates
- Browser pool utilization
- Active contexts and sessions
- Error rates and recovery events

### Health Checks

- Automatic browser crash detection
- Periodic health checks every 30 seconds
- Graceful degradation and recovery

## Error Handling

### Browser Crashes

- Automatic detection via Playwright's `disconnected` event
- Affected jobs are re-queued
- Browser processes are restarted automatically

### Job Failures

- Configurable retry logic
- Timeout handling for stuck operations
- Comprehensive error logging

### Resource Limits

- Global concurrency limits prevent system overload
- Per-browser context limits ensure stability
- Graceful queueing when limits are reached

## Development

### Project Structure

```
src/
├── domain/
│   ├── entities/          # Domain entities
│   ├── aggregates/        # Domain aggregates
│   ├── value-objects/     # Value objects
│   ├── services/          # Domain services
│   └── events/            # Domain events
├── application/
│   ├── use-cases/         # Application use cases
│   └── services/          # Application services
├── infrastructure/
│   ├── adapters/          # External system adapters
│   └── interfaces/        # Infrastructure interfaces
└── presentation/
    └── cli/               # Command-line interface
```

### Testing

#### Invariant Tests

Run comprehensive system invariant tests:

```bash
# Start mock server first (in separate terminal)
cd mock-server && npm start

# Run invariant tests
node test_invariants.js
```

#### Unit Tests

```bash
npm test
```

#### Mock Server

The `mock-server/` directory contains a local mock server for testing without external dependencies. See
`mock-server/README.md` for details.

### Linting

```bash
npm run lint
```

## Production Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx playwright install chromium

EXPOSE 3000
CMD ["npm", "start"]
```

### Systemd Service

```ini
[Unit]
Description=Playwright Scraping Service
After=network.target

[Service]
Type=simple
User=scraper
WorkingDirectory=/opt/scraping-service
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Scaling Considerations

### Vertical Scaling

- Increase `BROWSER_POOL_SIZE` for more processes
- Add more RAM/CPU cores
- Tune `MAX_CONTEXTS_PER_BROWSER` based on system capacity

### Horizontal Scaling

- Deploy multiple instances
- Use external job queue (Redis, RabbitMQ)
- Load balancer for job distribution

### Monitoring at Scale

- Centralized logging (ELK stack)
- Metrics aggregation (Prometheus + Grafana)
- Alerting for failures and performance degradation

## Troubleshooting

### High Memory Usage

- Reduce `MAX_CONTEXTS_PER_BROWSER`
- Enable more resource blocking
- Monitor with `ps aux | grep chromium`

### Slow Performance

- Check network connectivity
- Reduce `GLOBAL_MAX_CONCURRENCY`
- Enable more browser optimizations

### Browser Crashes

- Check system resources (RAM, disk space)
- Review Chromium launch flags
- Check for conflicting system processes

## License

This project is for educational purposes. See LICENSE file for details.

## Disclaimer

This tool is provided for educational and research purposes only. Ensure compliance with website terms of service and
applicable laws when web scraping. The authors assume no liability for misuse.