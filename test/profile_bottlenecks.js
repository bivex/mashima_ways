/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-25 00:24
 * Last Updated: 2026-02-25 00:24
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Performance profiling test for scraping service
 * Identifies bottlenecks in job processing pipeline
 */

import {ScrapingApplicationService} from '../src/application/services/ScrapingApplicationService.js';
import {ConfigLoader} from '../src/infrastructure/interfaces/ConfigLoader.js';

// Performance metrics tracker
class Profiler {
    constructor() {
        this.metrics = {
            // Timing metrics (in milliseconds)
            submitCallLatency: [],
            jobSubmissionLatency: [],
            queueWaitTime: [],
            browserAcquisitionTime: [],
            contextCreationTime: [],
            scrapingExecutionTime: [],
            contextCleanupTime: [],
            totalJobTime: [],
            endToEndTime: [],

            // Resource metrics
            memorySnapshots: [],
            cpuSnapshots: [],

            // Bottleneck indicators
            queueDepthSnapshots: [],
            activeJobSnapshots: [],
            browserPoolUtilization: [],

            // Event loop metrics
            eventLoopLag: [],

            // System metrics
            timestampSnapshots: []
        };

        this.startTime = Date.now();
        this.startMemory = process.memoryUsage();
    }

    // Mark a measurement point
    mark(category, label, value) {
        if (!this.metrics[category]) {
            this.metrics[category] = [];
        }
        this.metrics[category].push({
            label,
            value,
            timestamp: Date.now() - this.startTime
        });
    }

    // Record a timing measurement
    recordTime(category, value) {
        if (this.metrics[category]) {
            this.metrics[category].push(value);
        }
    }

    // Capture current system state
    captureSnapshot(label, activeJobs, queueDepth, browserStats) {
        const mem = process.memoryUsage();
        this.metrics.memorySnapshots.push({
            label,
            heapUsed: mem.heapUsed,
            heapTotal: mem.heapTotal,
            external: mem.external,
            rss: mem.rss,
            timestamp: Date.now() - this.startTime
        });

        this.metrics.queueDepthSnapshots.push(queueDepth);
        this.metrics.activeJobSnapshots.push(activeJobs);
        this.metrics.timestampSnapshots.push(Date.now() - this.startTime);

        if (browserStats) {
            const totalCapacity = Object.values(browserStats).reduce(
                (sum, b) => sum + (b.maxContexts || 0), 0
            );
            const totalActive = Object.values(browserStats).reduce(
                (sum, b) => sum + (b.activeContexts || 0), 0
            );
            this.metrics.browserPoolUtilization.push({
                label,
                utilization: totalCapacity > 0 ? (totalActive / totalCapacity * 100) : 0,
                totalActive,
                totalCapacity,
                timestamp: Date.now() - this.startTime
            });
        }
    }

    // Measure event loop lag
    measureEventLoopLag() {
        const start = Date.now();
        return new Promise(resolve => {
            setImmediate(() => {
                const lag = Date.now() - start;
                this.metrics.eventLoopLag.push(lag);
                resolve(lag);
            });
        });
    }

    // Calculate statistics for an array of values
    calculateStats(values) {
        if (values.length === 0) return {count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0};

        const sorted = [...values].sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);

        const percentile = (p) => {
            const idx = Math.ceil((p / 100) * sorted.length) - 1;
            return sorted[Math.max(0, idx)];
        };

        return {
            count: values.length,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            avg: sum / values.length,
            p50: percentile(50),
            p95: percentile(95),
            p99: percentile(99)
        };
    }

    // Generate bottleneck analysis report
    generateReport() {
        const endMemory = process.memoryUsage();
        const duration = Date.now() - this.startTime;

        console.log('\n' + '='.repeat(80));
        console.log('🔍 PERFORMANCE PROFILING REPORT');
        console.log('='.repeat(80));

        // Overall summary
        console.log('\n📊 OVERALL SUMMARY');
        console.log(`Total Duration: ${(duration / 1000).toFixed(2)}s`);
        console.log(`Memory Delta: heapUsed +${((endMemory.heapUsed - this.startMemory.heapUsed) / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Final RSS: ${(endMemory.rss / 1024 / 1024).toFixed(2)}MB`);

        // Timing analysis
        console.log('\n⏱️ TIMING ANALYSIS (milliseconds)');

        const timingCategories = [
            {key: 'submitCallLatency', label: 'Submit Call Latency'},
            {key: 'jobSubmissionLatency', label: 'Job Submission (to Queued)'},
            {key: 'queueWaitTime', label: 'Queue Wait Time'},
            {key: 'browserAcquisitionTime', label: 'Browser Acquisition'},
            {key: 'contextCreationTime', label: 'Context Creation'},
            {key: 'scrapingExecutionTime', label: 'Scraping Execution'},
            {key: 'contextCleanupTime', label: 'Context Cleanup'},
            {key: 'totalJobTime', label: 'Total Job Time (started→completed)'},
            {key: 'endToEndTime', label: 'End-to-End Time (submitted→completed)'}
        ];

        timingCategories.forEach(({key, label}) => {
            const stats = this.calculateStats(this.metrics[key]);
            if (stats.count > 0) {
                console.log(`\n  ${label}:`);
                console.log(`    Count: ${stats.count}`);
                console.log(`    Min: ${stats.min.toFixed(2)}ms`);
                console.log(`    Max: ${stats.max.toFixed(2)}ms`);
                console.log(`    Avg: ${stats.avg.toFixed(2)}ms`);
                console.log(`    P50: ${stats.p50.toFixed(2)}ms`);
                console.log(`    P95: ${stats.p95.toFixed(2)}ms`);
                console.log(`    P99: ${stats.p99.toFixed(2)}ms`);

                // Bottleneck detection
                if (stats.avg > 1000) {
                    console.log(`    ⚠️ BOTTLENECK: Average > 1s`);
                }
            }
        });

        // Event loop analysis
        console.log('\n🔄 EVENT LOOP ANALYSIS');
        const eventLoopStats = this.calculateStats(this.metrics.eventLoopLag);
        console.log(`  Lag: avg=${eventLoopStats.avg.toFixed(2)}ms, p95=${eventLoopStats.p95.toFixed(2)}ms`);
        if (eventLoopStats.p95 > 50) {
            console.log('  ⚠️ BOTTLENECK: Event loop lag > 50ms at P95');
        }

        // Queue and utilization analysis
        console.log('\n📈 QUEUE & UTILIZATION ANALYSIS');
        const queueStats = this.calculateStats(this.metrics.queueDepthSnapshots);
        console.log(`  Queue Depth: avg=${queueStats.avg.toFixed(2)}, max=${queueStats.max}`);

        const activeJobsStats = this.calculateStats(this.metrics.activeJobSnapshots);
        console.log(`  Active Jobs: avg=${activeJobsStats.avg.toFixed(2)}, max=${activeJobsStats.max}`);

        const utilizationStats = this.calculateStats(
            this.metrics.browserPoolUtilization.map(u => u.utilization)
        );
        console.log(`  Browser Pool Utilization: avg=${utilizationStats.avg.toFixed(1)}%, max=${utilizationStats.max.toFixed(1)}%`);

        if (utilizationStats.avg > 90) {
            console.log('  ⚠️ BOTTLENECK: Browser pool near saturation');
        }

        // Memory trend analysis
        console.log('\n💾 MEMORY ANALYSIS');
        const heapUsedSnapshots = this.metrics.memorySnapshots.map(m => m.heapUsed);
        const initialHeap = heapUsedSnapshots[0] || 0;
        const finalHeap = heapUsedSnapshots[heapUsedSnapshots.length - 1] || 0;
        const memoryGrowth = ((finalHeap - initialHeap) / initialHeap * 100);

        console.log(`  Heap Growth: ${memoryGrowth.toFixed(2)}%`);
        console.log(`  Initial Heap: ${(initialHeap / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  Final Heap: ${(finalHeap / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  Peak RSS: ${(Math.max(...this.metrics.memorySnapshots.map(m => m.rss)) / 1024 / 1024).toFixed(2)}MB`);

        if (memoryGrowth > 50) {
            console.log('  ⚠️ BOTTLENECK: Significant memory growth detected');
        }

        // Bottleneck summary
        console.log('\n🎯 IDENTIFIED BOTTLENECKS:');

        const bottlenecks = [];

        // Check timing bottlenecks
        timingCategories.forEach(({key, label}) => {
            const stats = this.calculateStats(this.metrics[key]);
            if (stats.count > 0) {
                const percentage = (stats.avg / duration) * 100;
                if (percentage > 20) {
                    bottlenecks.push({
                        severity: 'HIGH',
                        component: label,
                        issue: `Contributes ${percentage.toFixed(1)}% of total time`,
                        recommendation: 'Optimize or parallelize this operation'
                    });
                }
                if (stats.p95 > stats.avg * 5) {
                    bottlenecks.push({
                        severity: 'MEDIUM',
                        component: label,
                        issue: `High variance (P95=${stats.p95.toFixed(0)}ms, avg=${stats.avg.toFixed(0)}ms)`,
                        recommendation: 'Investigate outliers - may indicate resource contention'
                    });
                }
            }
        });

        // Check resource bottlenecks
        if (utilizationStats.avg > 90) {
            bottlenecks.push({
                severity: 'HIGH',
                component: 'Browser Pool',
                issue: `Utilization at ${utilizationStats.avg.toFixed(1)}%`,
                recommendation: 'Increase pool size or reduce maxContextsPerBrowser'
            });
        }

        if (eventLoopStats.p95 > 50) {
            bottlenecks.push({
                severity: 'HIGH',
                component: 'Event Loop',
                issue: `P95 lag at ${eventLoopStats.p95.toFixed(0)}ms`,
                recommendation: 'Offload CPU-intensive work from main thread'
            });
        }

        if (memoryGrowth > 50) {
            bottlenecks.push({
                severity: 'MEDIUM',
                component: 'Memory',
                issue: `${memoryGrowth.toFixed(1)}% growth during run`,
                recommendation: 'Check for memory leaks or implement proper cleanup'
            });
        }

        if (queueStats.avg > 50) {
            bottlenecks.push({
                severity: 'MEDIUM',
                component: 'Job Queue',
                issue: `Average depth ${queueStats.avg.toFixed(1)}`,
                recommendation: 'Increase throughput or implement better backpressure'
            });
        }

        if (bottlenecks.length === 0) {
            console.log('  ✅ No significant bottlenecks detected!');
        } else {
            bottlenecks.forEach(b => {
                const icon = b.severity === 'HIGH' ? '🔴' : '🟡';
                console.log(`  ${icon} ${b.component}: ${b.issue}`);
                console.log(`     → ${b.recommendation}`);
            });
        }

        console.log('\n' + '='.repeat(80));

        return {
            duration,
            bottlenecks,
            metrics: this.metrics
        };
    }
}

// Test with instrumentation
async function runProfileTest(config) {
    const profiler = new Profiler();

    console.log('🚀 Starting Performance Profiling Test...');
    console.log(`Configuration: ${config.browser.poolSize} browsers, ${config.browser.maxContextsPerBrowser} contexts/browser`);

    // Initialize service
    const initStart = Date.now();
    const service = new ScrapingApplicationService(config);
    await service.start();
    profiler.recordTime('initializationTime', Date.now() - initStart);
    console.log(`✅ Service initialized in ${Date.now() - initStart}ms`);

    // Test URLs (use a variety)
    const testUrls = [
        'https://example.com',
        'https://httpbin.org/delay/1',
        'https://httpbin.org/html',
        'https://www.google.com',
        'https://www.bing.com'
    ];

    const numJobs = 20; // Adjust based on your testing needs
    const jobSubmitTimes = new Map(); // jobId -> submit timestamp
    const jobQueuedTimes = new Map(); // jobId -> queued timestamp
    const jobStartTimes = new Map(); // jobId -> started timestamp
    let completedCount = 0;

    // Subscribe to events for timing tracking
    service.eventBus.subscribe('JobQueued', (event) => {
        const submitTime = jobSubmitTimes.get(event.aggregateId);
        if (submitTime) {
            const queueLatency = Date.now() - submitTime;
            profiler.recordTime('jobSubmissionLatency', queueLatency);
            jobQueuedTimes.set(event.aggregateId, Date.now());
        }
    });

    service.eventBus.subscribe('JobStarted', (event) => {
        const queuedTime = jobQueuedTimes.get(event.aggregateId);
        if (queuedTime) {
            const queueWaitTime = Date.now() - queuedTime;
            profiler.recordTime('queueWaitTime', queueWaitTime);
        }
        jobStartTimes.set(event.aggregateId, Date.now());
    });

    service.eventBus.subscribe('JobCompleted', (event) => {
        const startTime = jobStartTimes.get(event.aggregateId);
        if (startTime) {
            const totalTime = Date.now() - startTime;
            profiler.recordTime('totalJobTime', totalTime);

            // Capture scraping execution time from result
            if (event.data.result && event.data.result.duration) {
                profiler.recordTime('scrapingExecutionTime', event.data.result.duration);
            }
        }

        const submitTime = jobSubmitTimes.get(event.aggregateId);
        if (submitTime) {
            const endToEndTime = Date.now() - submitTime;
            profiler.recordTime('endToEndTime', endToEndTime);
        }

        completedCount++;
    });

    service.eventBus.subscribe('ContextCreated', (event) => {
        profiler.recordTime('contextCreationTime', 10); // Placeholder - need actual timing
    });

    service.eventBus.subscribe('ContextClosed', (event) => {
        profiler.recordTime('contextCleanupTime', 10); // Placeholder - need actual timing
    });

    console.log(`\n📤 Submitting ${numJobs} jobs...`);

    // Submit jobs
    const submissionStart = Date.now();
    const submitPromises = [];

    for (let i = 0; i < numJobs; i++) {
        const url = testUrls[i % testUrls.length];
        const jobId = `profiling-job-${i}`;

        jobSubmitTimes.set(jobId, Date.now());

        // submitJob returns after queueing, track submission latency separately
        const submitStart = Date.now();
        const promise = service.submitJob(url, {id: jobId});
        const submitLatency = Date.now() - submitStart;
        profiler.recordTime('submitCallLatency', submitLatency);

        submitPromises.push(promise);

        // Periodic snapshot during submission
        if (i % 5 === 0) {
            const status = await service.getStatus();
            profiler.captureSnapshot(
                `submit-${i}`,
                status.health.activeJobs,
                status.health.queueDepth,
                status.browsers
            );
        }

        // Small delay between submissions
        await new Promise(r => setTimeout(r, 50));
    }

    console.log(`✅ All jobs submitted in ${Date.now() - submissionStart}ms`);

    // Wait for all submissions to complete (just the submit calls)
    await Promise.all(submitPromises);

    // Monitor while jobs are processing
    console.log('\n📊 Monitoring job execution...');
    const monitoringInterval = setInterval(async () => {
        const status = await service.getStatus();
        profiler.captureSnapshot(
            'processing',
            status.health.activeJobs,
            status.health.queueDepth,
            status.browsers
        );
        await profiler.measureEventLoopLag();

        console.log(`  Active: ${status.health.activeJobs}, Queued: ${status.health.queueDepth}, Completed: ${status.health.completedJobs}`);
    }, 1000);

    // Wait for all jobs to complete - poll the status
    const maxWaitTime = 60000; // 60 seconds max
    const waitStart = Date.now();
    while (completedCount < numJobs && (Date.now() - waitStart) < maxWaitTime) {
        await new Promise(r => setTimeout(r, 500));
    }

    clearInterval(monitoringInterval);

    // Final snapshot
    const finalStatus = await service.getStatus();
    profiler.captureSnapshot(
        'final',
        finalStatus.health.activeJobs,
        finalStatus.health.queueDepth,
        finalStatus.browsers
    );

    console.log(`\n✅ All jobs completed`);
    console.log(`   Completed: ${finalStatus.health.completedJobs}`);
    console.log(`   Failed: ${finalStatus.health.failedJobs}`);
    console.log(`   Success Rate: ${finalStatus.health.successRate * 100}%`);

    // Shutdown
    const shutdownStart = Date.now();
    await service.shutdown();
    profiler.recordTime('shutdownTime', Date.now() - shutdownStart);

    // Generate report
    return profiler.generateReport();
}

// Main execution
(async () => {
    try {
        const config = ConfigLoader.load();

        // Override config for testing
        config.browser.poolSize = 2;
        config.browser.maxContextsPerBrowser = 10;
        config.browser.globalMaxConcurrency = 20;
        config.architecture = 'pool';

        const report = await runProfileTest(config);

        console.log('\n✅ Profiling test completed successfully');

        // Exit with appropriate code
        process.exit(report.bottlenecks.some(b => b.severity === 'HIGH') ? 1 : 0);
    } catch (error) {
        console.error('\n❌ Profiling test failed:', error);
        process.exit(1);
    }
})();
