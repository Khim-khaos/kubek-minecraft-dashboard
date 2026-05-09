const os = require("os");
const process = require("process");
const nodeDiskInfo = require('node-disk-info');

/**
 * Модуль для мониторинга состояния панели Kubek
 */

// Получить текущее состояние системы и процесса
exports.getHealthStatus = async () => {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    let disks = [];
    try {
        disks = nodeDiskInfo.getDiskInfoSync();
    } catch (e) {
        // Игнорируем ошибки получения инфо о дисках
    }
    
    return {
        status: "ok",
        timestamp: new Date().toISOString(),
        panel: {
            uptime: Math.round(uptime),
            memory: {
                rss: Math.round(memoryUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024),
            },
            nodeVersion: process.version,
            pid: process.pid
        },
        system: {
            platform: os.platform(),
            release: os.release(),
            arch: os.arch(),
            cpus: os.cpus().length,
            cpuModel: os.cpus()[0].model,
            loadavg: os.loadavg(),
            freeMemory: Math.round(os.freemem() / 1024 / 1024),
            totalMemory: Math.round(os.totalmem() / 1024 / 1024),
            uptime: Math.round(os.uptime()),
            disks: disks.map(d => ({
                drive: d.drive,
                capacity: d.capacity,
                used: d.used,
                available: d.available
            }))
        }
    };
};
