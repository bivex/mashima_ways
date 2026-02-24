/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-24 23:49
 * Last Updated: 2026-02-24 23:49
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

import {ScrapingApplicationService} from '../../application/services/ScrapingApplicationService.js';
import {ConfigLoader} from '../../infrastructure/interfaces/ConfigLoader.js';

export class ScrapingCLI {
    constructor() {
        this.config = ConfigLoader.load();
        this.service = new ScrapingApplicationService(this.config);
        this.running = false;
    }

    async start() {
        console.log('🚀 Starting Patchright Scraping Service');
        console.log('Configuration:', JSON.stringify(this.config, null, 2));

        this.running = true;

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n📴 Received SIGINT, shutting down gracefully...');
            await this.stop();
        });

        process.on('SIGTERM', async () => {
            console.log('\n📴 Received SIGTERM, shutting down gracefully...');
            await this.stop();
        });

        try {
            await this.service.start();

            // Start interactive CLI if no arguments provided
            if (process.argv.length === 2) {
                await this.startInteractiveCLI();
            } else {
                // Handle command line arguments
                await this.handleCommandLineArgs();
            }
        } catch (error) {
            console.error('❌ Failed to start service:', error);
            process.exit(1);
        }
    }

    async stop() {
        if (!this.running) return;

        this.running = false;
        console.log('🛑 Stopping service...');

        try {
            await this.service.shutdown();
            console.log('✅ Service stopped successfully');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    }

    async handleCommandLineArgs() {
        const args = process.argv.slice(2);
        const command = args[0];

        switch (command) {
            case 'submit':
                if (args.length < 2) {
                    console.error('Usage: submit <url> [options]');
                    process.exit(1);
                }
                await this.handleSubmitCommand(args[1], args.slice(2));
                break;

            case 'status':
                await this.handleStatusCommand();
                break;

            case 'test':
                await this.handleTestCommand();
                break;

            default:
                console.log('Available commands:');
                console.log('  submit <url> [options] - Submit a scraping job');
                console.log('  status                 - Show system status');
                console.log('  test                   - Run a test with sample jobs');
                console.log('  (no args)              - Start interactive CLI');
                await this.stop();
        }
    }

    async handleSubmitCommand(url, options) {
        try {
            console.log(`📤 Submitting job for: ${url}`);
            const result = await this.service.submitJob(url, this.parseOptions(options));
            console.log('✅ Job submitted:', result);
        } catch (error) {
            console.error('❌ Failed to submit job:', error.message);
        }
        await this.stop();
    }

    async handleStatusCommand() {
        try {
            const status = await this.service.getStatus();
            console.log('📊 System Status:');
            console.log(JSON.stringify(status, null, 2));
        } catch (error) {
            console.error('❌ Failed to get status:', error.message);
        }
        await this.stop();
    }

    async handleTestCommand() {
        console.log('🧪 Running test with sample jobs...');

        const testUrls = [
            'https://httpbin.org/html',
            'https://httpbin.org/json',
            'https://httpbin.org/xml',
            'https://httpbin.org/get'
        ];

        const jobs = [];
        for (let i = 0; i < 10; i++) {
            const url = testUrls[i % testUrls.length];
            try {
                const result = await this.service.submitJob(url, {
                    timeout: 10000,
                    waitUntil: 'domcontentloaded'
                });
                jobs.push(result);
                console.log(`✅ Submitted job ${i + 1}/10: ${result.jobId}`);
            } catch (error) {
                console.error(`❌ Failed to submit job ${i + 1}:`, error.message);
            }
        }

        console.log(`📋 Submitted ${jobs.length} test jobs`);

        // Wait for jobs to complete or timeout
        let completed = 0;
        let failed = 0;
        const timeout = Date.now() + 60000; // 1 minute timeout

        while ((completed + failed) < jobs.length && Date.now() < timeout) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const status = await this.service.getStatus();
            completed = status.queuedJobs === 0 && status.activeSessions === 0 ? jobs.length - failed : completed;

            if (status.activeSessions === 0 && status.queuedJobs === 0) {
                break;
            }
        }

        const finalStatus = await this.service.getStatus();
        console.log('🏁 Test completed:');
        console.log(`   Jobs submitted: ${jobs.length}`);
        console.log(`   Active sessions: ${finalStatus.activeSessions}`);
        console.log(`   Queued jobs: ${finalStatus.queuedJobs}`);
        console.log(`   Browser pool:`, finalStatus.browsers);

        await this.stop();
    }

    async startInteractiveCLI() {
        console.log('💻 Interactive CLI started. Type "help" for commands.');

        const readline = await import('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const askCommand = () => {
            rl.question('scraping> ', async (input) => {
                if (!this.running) {
                    rl.close();
                    return;
                }

                const args = input.trim().split(/\s+/);
                const command = args[0];

                try {
                    switch (command) {
                        case 'submit':
                            if (args.length < 2) {
                                console.log('Usage: submit <url>');
                            } else {
                                const result = await this.service.submitJob(args[1]);
                                console.log('Job submitted:', result);
                            }
                            break;

                        case 'status':
                            const status = await this.service.getStatus();
                            console.log(JSON.stringify(status, null, 2));
                            break;

                        case 'health':
                            const health = await this.service.healthCheck();
                            console.log(health.healthy ? '✅ System healthy' : '❌ System unhealthy');
                            break;

                        case 'help':
                            console.log('Available commands:');
                            console.log('  submit <url>    - Submit a scraping job');
                            console.log('  status          - Show system status');
                            console.log('  health          - Check system health');
                            console.log('  exit            - Exit CLI');
                            break;

                        case 'exit':
                            await this.stop();
                            rl.close();
                            return;

                        default:
                            if (input.trim()) {
                                console.log('Unknown command. Type "help" for available commands.');
                            }
                    }
                } catch (error) {
                    console.error('Error:', error.message);
                }

                askCommand();
            });
        };

        askCommand();
    }

    parseOptions(args) {
        const options = {};

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg.startsWith('--timeout=')) {
                options.timeout = parseInt(arg.split('=')[1]);
            } else if (arg.startsWith('--retries=')) {
                options.retries = parseInt(arg.split('=')[1]);
            } else if (arg === '--no-js') {
                options.javaScriptEnabled = false;
            } else if (arg.startsWith('--wait=')) {
                options.waitUntil = arg.split('=')[1];
            }
        }

        return options;
    }
}