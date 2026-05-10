const os = require("os");
const nodeDiskInfo = require("node-disk-info");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

let cpuCalculationPromise = null;
let lastCPUUsage = 0;
let lastCPUTime = 0;

// Вспомогательная функция для расчета использования ЦПУ без os-utils
const getCPUUsage = () => {
    // Если расчет уже идет, возвращаем текущий промис
    if (cpuCalculationPromise) return cpuCalculationPromise;
    
    // Если данные свежие (меньше 2 сек), возвращаем кешированное значение
    if (Date.now() - lastCPUTime < 2000) return Promise.resolve(lastCPUUsage);

    cpuCalculationPromise = new Promise((resolve) => {
        try {
            const stats1 = getCPUInfo();
            if (!stats1) {
                cpuCalculationPromise = null;
                return resolve(0);
            }

            setTimeout(() => {
                const stats2 = getCPUInfo();
                if (!stats2) {
                    cpuCalculationPromise = null;
                    return resolve(lastCPUUsage);
                }

                const idleDiff = stats2.idle - stats1.idle;
                const totalDiff = stats2.total - stats1.total;
                
                if (totalDiff === 0) {
                    lastCPUUsage = 0;
                } else {
                    const usage = 1 - idleDiff / totalDiff;
                    lastCPUUsage = Math.round(usage * 100);
                }
                
                // LOGGER is not defined here, but we can use console.log if DEBUG is on
                if (process.env.DEBUG === 'true') {
                    console.log(`[Hardware] CPU Usage calculated: ${lastCPUUsage}% (totalDiff: ${totalDiff})`);
                }

                lastCPUTime = Date.now();
                cpuCalculationPromise = null;
                resolve(lastCPUUsage);
            }, 1000);
        } catch (e) {
            cpuCalculationPromise = null;
            resolve(0);
        }
    });
    
    return cpuCalculationPromise;
};

const getCPUInfo = () => {
    const cpus = os.cpus();
    if (!cpus || cpus.length === 0) return null;

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