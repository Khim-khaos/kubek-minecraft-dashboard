const express = require("express");
const router = express.Router();
const os = require("os");
const packageJSON = require("./../package.json");

/**
 * Endpoint для проверки работоспособности системы
 */
router.get("/", function (req, res) {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    res.send({
        status: "ok",
        version: packageJSON.version,
        uptime: Math.floor(uptime),
        platform: os.platform(),
        arch: os.arch(),
        memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024) + " MB",
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB"
        },
        timestamp: new Date().toISOString()
    });
});

module.exports.router = router;
