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

import {exec} from 'child_process';
import {promisify} from 'util';
import os from 'os';
import {readdir, readFile} from 'fs/promises';

const execAsync = promisify(exec);

export class ResourceMonitor {
    constructor(options = {}) {
        this.checkInterval = options.checkInterval || 30000; // 30 seconds
        this.memoryThreshold = options.memoryThreshold || 0.8; // 80%
        this.cpuThreshold = options.cpuThreshold || 0.7; // 70%
        this.fdThreshold = options.fdThreshold || 0.8; // 80% of ulimit

        this.metrics = {
            memory: {used: 0, total: 0, percentage: 0},
            cpu: {usage: 0, cores: os.cpus().length},
            fileDescriptors: {used: 0, limit: 0, percentage: 0},
            processes: {chromium: 0, total: 0},
            timestamp: new Date()
        };

        this.isOverloaded = false;
        this.lastCheck = null;

        // Cache for expensive operations
        this.fdLimit = null;
        this.lastCpuInfo = null;
    }

    /**
     * Получить текущие метрики системы
     */
    async getMetrics() {
        try {
            const metrics = {...this.metrics};
            metrics.timestamp = new Date();

            // Memory usage (synchronous, fast)
            metrics.memory = this._getMemoryInfo();

            // CPU usage (synchronous, fast)
            metrics.cpu.usage = this._getCpuUsage();

            // Run expensive operations in parallel
            const [fdInfo, procInfo] = await Promise.all([
                this._getFileDescriptorInfo(),
                this._getProcessInfo()
            ]);

            metrics.fileDescriptors = fdInfo;
            metrics.processes = procInfo;

            // Update overload status
            this.isOverloaded = this._checkOverload(metrics);

            this.lastCheck = metrics.timestamp;
            this.metrics = metrics;

            return metrics;
        } catch (error) {
            console.warn('Resource monitoring error:', error.message);
            return this.metrics;
        }
    }

    /**
     * Проверить, перегружена ли система
     */
    isSystemOverloaded() {
        return this.isOverloaded;
    }

    /**
     * Получить рекомендации по корректировке нагрузки
     */
    getLoadRecommendations() {
        const recommendations = [];

        if (this.metrics.memory.percentage > this.memoryThreshold) {
            recommendations.push({
                type: 'memory',
                level: 'critical',
                message: `Memory usage ${Math.round(this.metrics.memory.percentage * 100)}% > ${Math.round(this.memoryThreshold * 100)}%`,
                action: 'Reduce concurrent contexts or add more RAM'
            });
        }

        if (this.metrics.cpu.usage > this.cpuThreshold) {
            recommendations.push({
                type: 'cpu',
                level: 'warning',
                message: `CPU usage ${Math.round(this.metrics.cpu.usage * 100)}% > ${Math.round(this.cpuThreshold * 100)}%`,
                action: 'Reduce browser pool size or add more CPU cores'
            });
        }

        if (this.metrics.fileDescriptors.percentage > this.fdThreshold) {
            recommendations.push({
                type: 'file_descriptors',
                level: 'critical',
                message: `FD usage ${Math.round(this.metrics.fileDescriptors.percentage * 100)}% > ${Math.round(this.fdThreshold * 100)}%`,
                action: 'Increase ulimit -n or reduce concurrent contexts'
            });
        }

        if (this.metrics.processes.chromium > 10) {
            recommendations.push({
                type: 'processes',
                level: 'warning',
                message: `${this.metrics.processes.chromium} Chromium processes running`,
                action: 'Consider reducing browser pool size'
            });
        }

        return recommendations;
    }

    /**
     * Получить сводку состояния системы
     */
    getSystemSummary() {
        const metrics = this.metrics;
        const recommendations = this.getLoadRecommendations();

        return {
            status: this.isOverloaded ? 'overloaded' : 'healthy',
            memory: `${Math.round(metrics.memory.percentage * 100)}% (${Math.round(metrics.memory.used / 1024 / 1024 / 1024 * 10) / 10}GB/${Math.round(metrics.memory.total / 1024 / 1024 / 1024 * 10) / 10}GB)`,
            cpu: `${Math.round(metrics.cpu.usage * 100)}% (${metrics.cpu.cores} cores)`,
            fileDescriptors: `${metrics.fileDescriptors.used}/${metrics.fileDescriptors.limit} (${Math.round(metrics.fileDescriptors.percentage * 100)}%)`,
            processes: `${metrics.processes.chromium} Chromium, ${metrics.processes.total} total`,
            recommendations: recommendations.length,
            lastCheck: metrics.timestamp
        };
    }

    _getMemoryInfo() {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;

        // Debug logging for memory info
        if (total === 0) {
            console.warn('ResourceMonitor: os.totalmem() returned 0 - this might be an OS compatibility issue');
        }

        return {
            used,
            free,
            total,
            percentage: total > 0 ? used / total : 0
        };
    }

    _getCpuUsage() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;

        // Calculate CPU usage from current CPU info
        for (const cpu of cpus) {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        }

        // If we have previous CPU info, calculate delta
        if (this.lastCpuInfo) {
            const idleDiff = totalIdle - this.lastCpuInfo.idle;
            const totalDiff = totalTick - this.lastCpuInfo.total;
            const usage = 1 - (idleDiff / totalDiff);

            this.lastCpuInfo = {idle: totalIdle, total: totalTick};
            return Math.max(0, Math.min(usage, 1.0));
        }

        // First run - store baseline
        this.lastCpuInfo = {idle: totalIdle, total: totalTick};

        // Fallback to load average on first run
        const loadAvg = os.loadavg()[0];
        return Math.min(loadAvg / cpus.length, 1.0);
    }

    async _getFileDescriptorInfo() {
        try {
            // Cache the FD limit (it rarely changes)
            if (this.fdLimit === null) {
                try {
                    const {stdout} = await execAsync('ulimit -n', {timeout: 1000});
                    this.fdLimit = parseInt(stdout.trim()) || 1024;
                } catch (e) {
                    this.fdLimit = 1024; // Fallback
                }
            }

            // Use /proc filesystem on Linux for better performance
            if (process.platform === 'linux') {
                try {
                    // Count FDs from /proc for current process and children
                    const pid = process.pid;
                    const fdDir = `/proc/${pid}/fd`;
                    const fds = await readdir(fdDir);
                    const used = fds.length;

                    return {
                        used,
                        limit: this.fdLimit,
                        percentage: used / this.fdLimit
                    };
                } catch (e) {
                    // Fall through to command-based approach
                }
            }

            // Fallback to async command execution (non-blocking)
            // Use timeout to prevent hanging
            const {stdout} = await execAsync(
                `lsof -p $(pgrep -f chromium | tr '\\n' ',' | sed 's/,$//') 2>/dev/null | wc -l || echo "0"`,
                {timeout: 2000}
            );
            const used = parseInt(stdout.trim()) || 0;

            return {
                used,
                limit: this.fdLimit,
                percentage: this.fdLimit > 0 ? used / this.fdLimit : 0
            };
        } catch (error) {
            return {used: 0, limit: this.fdLimit || 1024, percentage: 0};
        }
    }

    async _getProcessInfo() {
        try {
            // Run both commands in parallel with timeout
            const [chromiumResult, totalResult] = await Promise.all([
                execAsync(`pgrep -f chromium | wc -l`, {timeout: 1000}).catch(() => ({stdout: '0'})),
                execAsync(`ps aux | wc -l`, {timeout: 1000}).catch(() => ({stdout: '0'}))
            ]);

            const chromium = parseInt(chromiumResult.stdout.trim()) || 0;
            const total = parseInt(totalResult.stdout.trim()) || 0;

            return {chromium, total};
        } catch (error) {
            return {chromium: 0, total: 0};
        }
    }

    _checkOverload(metrics) {
        return (
            metrics.memory.percentage > this.memoryThreshold ||
            metrics.cpu.usage > this.cpuThreshold ||
            metrics.fileDescriptors.percentage > this.fdThreshold
        );
    }

    /**
     * Начать периодический мониторинг
     */
    startMonitoring(callback) {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }

        this.monitorInterval = setInterval(async () => {
            const metrics = await this.getMetrics();
            if (callback) {
                callback(metrics, this.getLoadRecommendations());
            }
        }, this.checkInterval);

        console.log(`🖥️ Resource monitoring started (interval: ${this.checkInterval}ms)`);
    }

    /**
     * Остановить мониторинг
     */
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
            console.log('🖥️ Resource monitoring stopped');
        }
    }
}

// Singleton instance
export const resourceMonitor = new ResourceMonitor();