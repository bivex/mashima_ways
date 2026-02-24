#!/usr/bin/env node
/**
 * Copyright (c) 2025 Bivex
 *
 * Mashima Ways - Library Exports
 * All components available for external use
 */

// Domain Services
export { StealthManager } from './domain/services/StealthManager.js';
export { BrowserPoolManager } from './domain/services/BrowserPoolManager.js';
export { ContextManager } from './domain/services/ContextManager.js';
export { ContextPool } from './domain/services/ContextPool.js';
export { EventBus } from './domain/services/EventBus.js';
export { JobScheduler } from './domain/services/JobScheduler.js';
export { ResourceMonitor } from './domain/services/ResourceMonitor.js';
export { Semaphore } from './domain/services/Semaphore.js';
export { SingleBrowserManager } from './domain/services/SingleBrowserManager.js';
export { UserAgentManager } from './domain/services/UserAgentManager.js';

// Domain Entities
export { Browser } from './domain/entities/Browser.js';
export { BrowserContext } from './domain/entities/BrowserContext.js';
export { Job } from './domain/entities/Job.js';

// Domain Value Objects
export { BrowserConfig } from './domain/value-objects/BrowserConfig.js';
export { JobResult } from './domain/value-objects/JobResult.js';
export { Url } from './domain/value-objects/Url.js';

// Infrastructure
export { PlaywrightBrowserAdapter } from './infrastructure/adapters/PlaywrightBrowserAdapter.js';
export { InMemoryJobQueue } from './infrastructure/adapters/InMemoryJobQueue.js';
export { ConfigLoader } from './infrastructure/interfaces/ConfigLoader.js';
export { Logger } from './infrastructure/interfaces/Logger.js';
export { MetricsCollector } from './infrastructure/interfaces/MetricsCollector.js';

// Application Services
export { BrowserPoolService } from './application/services/BrowserPoolService.js';
export { ScrapingApplicationService } from './application/services/ScrapingApplicationService.js';
export { ScrapingService } from './application/services/ScrapingService.js';
export { SingleBrowserApplicationService } from './application/services/SingleBrowserApplicationService.js';

// Use Cases
export { GetSystemStatus } from './application/use-cases/GetSystemStatus.js';
export { SubmitScrapingJob } from './application/use-cases/SubmitScrapingJob.js';

// Presentation
export { ScrapingCLI } from './presentation/cli/ScrapingCLI.js';

