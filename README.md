# mashima_ways

Web scraping service built with Patchright/Playwright. Scrapes sites at scale without getting banned.

## What it does

- Run 100-200 scraping jobs concurrently
- Browser pool management with crash recovery
- Stealth mode to avoid detection
- CLI for job submission and monitoring

## Quick start

```bash
# Install
npm install
npx playwright install chromium

# Run
npm start
```

## Usage

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

## Code example

```javascript
import {ScrapingApplicationService} from './src/application/services/ScrapingApplicationService.js';
import {ConfigLoader} from './src/infrastructure/interfaces/ConfigLoader.js';

const config = ConfigLoader.load();
const service = new ScrapingApplicationService(config);

await service.start();
const result = await service.submitJob('https://example.com');
await service.shutdown();
```

## Config

Edit `config/default.js` or use env vars:

```bash
export BROWSER_POOL_SIZE=5
export MAX_CONTEXTS_PER_BROWSER=50
export GLOBAL_MAX_CONCURRENCY=250
export JOB_TIMEOUT=30000
```

## Requirements

- Node.js 18+
- 4GB+ RAM
- Unix/Linux (for file descriptor limits)

## Project structure

```
src/
├── domain/        # Core entities and business logic
├── application/   # Use cases and services
├── infrastructure/# Adapters and interfaces
└── presentation/  # CLI
```

## License

MIT
