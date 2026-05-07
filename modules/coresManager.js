const PREDEFINED = require("./predefined");
const CORES_URL_GEN = require("./coresURLGenerator");

// Функция для получения списка версий ядра
exports.getCoreVersions = (core, cb) => {
    if (typeof PREDEFINED.SERVER_CORES[core] !== "undefined") {
        let coreItem = PREDEFINED.SERVER_CORES[core];
        switch (coreItem.versionsMethod) {
            case "externalURL":
                CORES_URL_GEN.getAllCoresByExternalURL(coreItem.versionsUrl, cb);
                break;
            case "paper":
                CORES_URL_GEN.getAllPaperLikeCores(cb, coreItem.name);
                break;
            case "purpur":
                CORES_URL_GEN.getAllPurpurCores(cb);
                break;
            case "magma":
                CORES_URL_GEN.getAllMagmaCores(cb);
                break;
            case "forge":
                CORES_URL_GEN.getAllForgeCores(cb);
                break;
            case "fabric":
                CORES_URL_GEN.getAllFabricCores(cb);
                break;
            case "neoforge":
                CORES_URL_GEN.getAllNeoForgeCores(cb);
                break;
            default:
                cb(false);
                break;
        }
    } else {
        cb(false);
    }
};

exports.getCoreVersionURL = (core, version, cb) => {
    if (typeof PREDEFINED.SERVER_CORES[core] !== "undefined" && version !== "undefined") {
        let coreItem = PREDEFINED.SERVER_CORES[core];
        
        // Парсим версию с build номером (формат: "1.20.1#123")
        let versionOnly = version;
        let buildNumber = null;
        
        if (version.includes('#')) {
            const parts = version.split('#');
            versionOnly = parts[0];
            buildNumber = parts[1];
        }
        
        switch (coreItem.urlGetMethod) {
            case "externalURL":
                CORES_URL_GEN.getCoreByExternalURL(coreItem.versionsUrl, version, cb);
                break;
            case "paper":
                // Для Paper-like ядер используем версию без build номера
                // (build номер используется только для отображения)
                CORES_URL_GEN.getPaperCoreURL(coreItem.name, versionOnly, cb);
                break;
            case "purpur":
                CORES_URL_GEN.getPurpurCoreURL(versionOnly, cb);
                break;
            case "magma":
                CORES_URL_GEN.getMagmaCoreURL(versionOnly, cb);
                break;
            case "forge":
                CORES_URL_GEN.getForgeCoreURL(versionOnly, cb);
                break;
            case "fabric":
                CORES_URL_GEN.getFabricCoreURL(versionOnly, cb);
                break;
            case "neoforge":
                CORES_URL_GEN.getNeoForgeCoreURL(versionOnly, cb);
                break;
            default:
                cb(false);
                break;
        }
    } else {
        cb(false);
    }
};

// Функция для получения списка поддерживаемых версий Minecraft для ядра
exports.getSupportedMCVersionsForCore = (core, cb) => {
    if (typeof PREDEFINED.SERVER_CORES[core] !== "undefined") {
        CORES_URL_GEN.getSupportedMCVersionsForCore(core, cb);
    } else {
        cb(false);
    }
};

// Функция для получения списка версий/сборок ядра для конкретной версии Minecraft
exports.getCoreVersionsForMCVersion = (core, mcVersion, cb) => {
    if (typeof PREDEFINED.SERVER_CORES[core] === "undefined") {
        cb(false);
        return;
    }
    
    let coreItem = PREDEFINED.SERVER_CORES[core];
    
    // Для Paper-like ядер возвращаем сборки (builds)
    if (coreItem.versionsMethod === "paper") {
        CORES_URL_GEN.getPaperBuildsForMCVersion(core, mcVersion, cb);
        return;
    }
    
    // Для NeoForge возвращаем версии ядра для этой версии Minecraft
    if (core === "neoforge") {
        CORES_URL_GEN.getNeoForgeVersionsForMC(mcVersion, cb);
        return;
    }
    
    // Для Forge получаем список доступных версий ядра
    if (core === "forge") {
        CORES_URL_GEN.getForgeVersionsForMC(mcVersion, cb);
        return;
    }

    // Для Fabric получаем список доступных загрузчиков
    if (core === "fabric") {
        CORES_URL_GEN.getFabricVersionsForMC(mcVersion, cb);
        return;
    }
    
    // Для остальных ядер просто возвращаем версию Minecraft как единственный вариант
    // (так как для них версия ядра = версия Minecraft)
    cb([{
        version: mcVersion,
        display: mcVersion
    }]);
};

// Функция для получения списка ядер
exports.getCoresList = () => {
    return PREDEFINED.SERVER_CORES;
};