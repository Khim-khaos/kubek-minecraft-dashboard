const os = require("os");
const nodeDiskInfo = require("node-disk-info");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

// Вспомогательная функция для расчета использования ЦПУ без os-utils
const getCPUUsage = () => {
    return new Promise((resolve) => {
        const stats1 = getCPUInfo();
        setTimeout(() => {
            const stats2 = getCPUInfo();
            const idleDiff = stats2.idle - stats1.idle;
            const totalDiff = stats2.total - stats1.total;
            
            if (totalDiff === 0) {
                return resolve(0);
            }
            
            const usage = 1 - idleDiff / totalDiff;
            resolve(Math.round(usage * 100));
        }, 1000);
    });
};

const getCPUInfo = () => {
    const cpus = os.cpus();
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0, total = 0;
    for (const cpu of cpus) {
        user += cpu.times.user;
        nice += cpu.times.nice;
        sys += cpu.times.sys;
        idle += cpu.times.idle;
        irq += cpu.times.irq;
    }
    total = user + nice + sys + idle + irq;
    return { idle, total };
};

// Получить информацию об использовании ЦПУ и ОЗУ
exports.getResourcesUsage = async () => {
    const cpuValue = await getCPUUsage();
    return {
        cpu: cpuValue,
        ram: {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem(),
            percent: 100 - Math.round((os.freemem() / os.totalmem()) * 100)
        }
    };
};

// Функция для получения инфо о дисках через PowerShell (fallback для Windows)
exports.getDisksWindowsFallback = async () => {
    try {
        const { stdout } = await execAsync('powershell "Get-PSDrive -PSProvider FileSystem | Select-Object Name, Used, Free | ConvertTo-Json"', { encoding: 'utf8' });
        const data = JSON.parse(stdout);
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
exports.getHardwareInfo = async () => {
    try {
        let disks = [];
        if (process.platform === "win32") {
            // На Windows используем PowerShell напрямую, чтобы избежать ошибок отсутствующего wmic
            disks = await getDisksWindowsFallback();
        } else {
            try {
                disks = await nodeDiskInfo.getDiskInfo();
            } catch (diskError) {
                disks = [];
            }
        }

        const cpuItem = os.cpus()[0];
        return {
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
        };
    } catch (reason) {
        console.error("Error getting hardware info:", reason);
        return false;
    }
}