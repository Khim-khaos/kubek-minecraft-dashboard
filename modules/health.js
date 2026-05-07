const os = require("os");
const process = require("process");

/**
 * Модуль для мониторинга состояния панели Kubek
 */

// Получить текущее состояние системы и процесса
exports.getHealthStatus = () => {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
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
            loadavg: os.loadavg(),
            freeMemory: Math.round(os.freemem() / 1024 / 1024),
            totalMemory: Math.round(os.totalmem() / 1024 / 1024),
            uptime: Math.round(os.uptime())
        }
    };
};
