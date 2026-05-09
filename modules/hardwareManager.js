const os = require("os");
const nodeDiskInfo = require("node-disk-info");
const osutils = require("os-utils");
const { execSync } = require("child_process");

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

// Функция для получения инфо о дисках через PowerShell (fallback для Windows)
const getDisksWindowsFallback = () => {
    try {
        const output = execSync('powershell "Get-PSDrive -PSProvider FileSystem | Select-Object Name, Used, Free | ConvertTo-Json"', { encoding: 'utf8' });
        const data = JSON.parse(output);
        const disks = Array.isArray(data) ? data : [data];
        return disks.map(d => ({
            _filesystem: 'Unknown',
            _blocks: (d.Used || 0) + (d.Free || 0),
            _used: d.Used || 0,
            _available: d.Free || 0,
            _capacity: d.Used ? Math.round((d.Used / (d.Used + d.Free)) * 100) + '%' : '0%',
            _mounted: d.Name + ':'
        }));
    } catch (e) {
        return [];
    }
};

// Получить суммарную информацию о системе и железе
exports.getHardwareInfo = async (cb) => {
    try {
        let disks = [];
        try {
            disks = await nodeDiskInfo.getDiskInfo();
        } catch (diskError) {
            if (process.platform === "win32") {
                disks = getDisksWindowsFallback();
            }
        }

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