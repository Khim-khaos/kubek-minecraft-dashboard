const os = require("os");
const nodeDiskInfo = require("node-disk-info");
const osutils = require("os-utils");

// Получить информацию об использовании ЦПУ и ОЗУ
exports.getResourcesUsage = (cb) => {
    osutils.cpuUsage(function (cpuValue) {
        cb({
            cpu: Math.round(cpuValue * 100),
            ram: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem(),
                percent: 100 - Math.round((os.freemem() / os.totalmem()) * 100)
            }
        });
    });
};

// Получить суммарную информацию о системе и железе
exports.getHardwareInfo = async (cb) => {
    try {
        const disks = await nodeDiskInfo.getDiskInfo();
        const cpuItem = os.cpus()[0];
        cb({
            uptime: Math.round(process.uptime()),
            platform: {
                name: os.type(),
                release: os.release(),
                arch: process.arch,
                version: os.version(),
                nodeVersion: process.version
            },
            totalmem: Math.round(os.totalmem() / 1024 / 1024),
            cpu: {
                model: cpuItem.model,
                speed: cpuItem.speed,
                cores: os.cpus().length,
            },
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem()
            },
            enviroment: process.env,
            disks: disks,
            networkInterfaces: os.networkInterfaces(),
        });
    } catch (reason) {
        console.error("Error getting hardware info:", reason);
        cb(false);
    }
}