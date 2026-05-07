const COMMONS = require("./commons");
const LOGGER = require("./logger");
const PREDEFINED = require("./predefined");

/////////////////////////////////////////////////////
/* ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ ССЫЛОК НА СКАЧИВАНИЕ ЯДЕР */
/////////////////////////////////////////////////////

// Метод с API PaperMC
exports.getPaperCoreURL = (core, version, cb) => {
    let firstStepURL = "https://api.papermc.io/v2/projects/" + core + "/versions/" + version;
    COMMONS.getDataByURL(firstStepURL, (data) => {
        if (data === false) {
            LOGGER.warning("Oops! An error occurred while fetching cores");
            cb(false);
            return;
        }
        let lastBuildNumber = Math.max.apply(null, data.builds);
        COMMONS.getDataByURL(firstStepURL + "/builds/" + lastBuildNumber, (data2) => {
            if (data2 === false) {
                LOGGER.warning("Oops! An error occurred while fetching cores");
                cb(false);
                return;
            }
            let downloadFileName = data2.downloads.application.name;
            let finishURL = firstStepURL + "/builds/" + lastBuildNumber + "/downloads/" + downloadFileName;
            cb(finishURL);
        });
    });
};

// Метод с API PurpurMC
exports.getPurpurCoreURL = (version, cb) => {
    cb("https://api.purpurmc.org/v2/purpur/" + version + "/latest/download");
};

// Метод с API MagmaFoundation
exports.getMagmaCoreURL = (version, cb) => {
    cb("https://api.magmafoundation.org/api/v2/" + version + "/latest/download");
};

// Метод с external URL
exports.getCoreByExternalURL = (url, version, cb) => {
    COMMONS.getDataByURL(url, (data) => {
        if (data === false) {
            LOGGER.warning("Oops! An error occurred while fetching cores");
            cb(false);
            return;
        }
        cb(data[version]);
    });
};

/////////////////////////////////////////////////
/* ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ СПИСКА ДОСТУПНЫХ ЯДЕР */
/////////////////////////////////////////////////

// Метод с API PaperMC
exports.getAllPaperLikeCores = (cb, core = "paper") => {
    COMMONS.getDataByURL("https://api.papermc.io/v2/projects/" + core, (data) => {
        if (data === false) {
            LOGGER.warning("Oops! An error occurred while fetching cores");
            cb(false);
            return;
        }
        let paperCoresList = data.versions;
        paperCoresList.reverse();
        cb(paperCoresList);
    });
}

// Метод с API MagmaFoundation
exports.getAllMagmaCores = (cb) => {
    COMMONS.getDataByURL("https://api.magmafoundation.org/api/v2/allVersions", (data) => {
        if (data === false || !Array.isArray(data)) {
            LOGGER.warning("Oops! An error occurred while fetching Magma cores");
            cb(false);
            return;
        }
        cb(data);
    });
}

// Метод с API PurpurMC
exports.getAllPurpurCores = (cb) => {
    COMMONS.getDataByURL("https://api.purpurmc.org/v2/purpur/", (data) => {
        if (data === false) {
            LOGGER.warning("Oops! An error occurred while fetching cores");
            cb(false);
            return;
        }
        let purpurCores2 = data.versions;
        purpurCores2.reverse();
        cb(purpurCores2);
    });
}

// Метод с external URL
exports.getAllCoresByExternalURL = (url, cb) => {
    let resultList = [];

    COMMONS.getDataByURL(url, (data) => {
        if (data === false || typeof data !== 'object' || Array.isArray(data)) {
            LOGGER.warning("Oops! An error occurred while fetching cores from external URL");
            cb(false);
            return;
        }
        for (const [key] of Object.entries(data)) {
            resultList.push(key);
        }
        cb(resultList);
    });
};

/////////////////////////////////////////////////////
/* ФУНКЦИИ ДЛЯ FORGE */
/////////////////////////////////////////////////////

// Получить список версий Minecraft для Forge
exports.getAllForgeCores = (cb) => {
    // Пробуем основной URL и зеркала
    let urlsToTry = [
        "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json",
        "https://dl.mslmc.cn/forge/promotions_slim.json"
    ];
    
    function tryNext(index) {
        if (index >= urlsToTry.length) {
            LOGGER.warning("Oops! An error occurred while fetching Forge versions");
            cb(false);
            return;
        }
        
        COMMONS.getDataByURL(urlsToTry[index], (data) => {
            if (data === false) {
                LOGGER.warning("Failed to fetch from " + urlsToTry[index] + ", trying next...");
                tryNext(index + 1);
                return;
            }
            // Получаем все версии Minecraft из promos
            let forgeVersions = [];
            if (data && data.promos) {
                // Получаем уникальные версии Minecraft (без суффиксов -recommended, -latest)
                let mcVersions = new Set();
                for (let key of Object.keys(data.promos)) {
                    let mcVersion = key.replace(/-(recommended|latest)$/, '');
                    mcVersions.add(mcVersion);
                }
                forgeVersions = Array.from(mcVersions).reverse();
            }
            cb(forgeVersions);
        });
    }
    
    tryNext(0);
};

// Получить ссылку на скачивание Forge для конкретной версии
exports.getForgeCoreURL = (version, cb) => {
    let mcVersion = version;
    let forgeVersionFromInput = null;

    // Если версия в формате mcVersion-forgeVersion
    if (version.includes('-')) {
        const parts = version.split('-');
        if (parts.length >= 2) {
            const lastPart = parts[parts.length - 1];
            if (/^\d+\.\d+/.test(lastPart)) {
                forgeVersionFromInput = lastPart;
                mcVersion = parts.slice(0, -1).join('-');
            }
        }
    }

    // Если версия уже известна, сразу формируем URL без лишних запросов
    if (forgeVersionFromInput) {
        let forgeUrl = "https://maven.minecraftforge.net/net/minecraftforge/forge/" + 
                      mcVersion + "-" + forgeVersionFromInput + 
                      "/forge-" + mcVersion + "-" + forgeVersionFromInput + "-installer.jar";
        
        let bmclapiUrl = "https://bmclapi2.bangbang93.com/maven/net/minecraftforge/forge/" + 
                        mcVersion + "-" + forgeVersionFromInput + 
                        "/forge-" + mcVersion + "-" + forgeVersionFromInput + "-installer.jar";
        
        let nyistUrl = "https://mirror.nyist.edu.cn/bmclapi/net/minecraftforge/forge/" +
                       mcVersion + "-" + forgeVersionFromInput +
                       "/forge-" + mcVersion + "-" + forgeVersionFromInput + "-installer.jar";
        
        return cb(forgeUrl, [bmclapiUrl, nyistUrl]);
    }

    // Пробуем получить данные с основного URL или зеркала
    let urlsToTry = [
        "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json",
        "https://bmclapi2.bangbang93.com/forge/minecraft/" + mcVersion
    ];
    
    function tryNext(index, mcVersion) {
        if (index >= urlsToTry.length) {
            LOGGER.warning("Oops! An error occurred while fetching Forge URL");
            cb(false);
            return;
        }
        
        COMMONS.getDataByURL(urlsToTry[index], (data) => {
            if (data === false || (index > 0 && !Array.isArray(data))) {
                LOGGER.warning("Failed to fetch from " + urlsToTry[index] + ", trying next...");
                tryNext(index + 1, mcVersion);
                return;
            }
            
            let forgeVersion = forgeVersionFromInput;
            
            if (!forgeVersion) {
                if (index === 0) {
                    // Официальный API
                    if (data && data.promos) {
                        forgeVersion = data.promos[mcVersion + "-recommended"] || 
                                      data.promos[mcVersion + "-latest"];
                    }
                } else {
                    // BMCLAPI - массив версий
                    if (Array.isArray(data) && data.length > 0) {
                        // Берём последнюю версию (первая в списке)
                        forgeVersion = data[0].version;
                    }
                }
            }
            
            if (forgeVersion) {
                // Формируем URL для installer (основной + зеркала)
                let forgeUrl = "https://maven.minecraftforge.net/net/minecraftforge/forge/" + 
                              mcVersion + "-" + forgeVersion + 
                              "/forge-" + mcVersion + "-" + forgeVersion + "-installer.jar";
                
                // BMCLAPI зеркало (прямой maven, без промежуточной verify-страницы)
                let bmclapiUrl = "https://bmclapi2.bangbang93.com/maven/net/minecraftforge/forge/" + 
                                mcVersion + "-" + forgeVersion + 
                                "/forge-" + mcVersion + "-" + forgeVersion + "-installer.jar";
                
                // NYIST mirror (прямой путь bmclapi)
                let nyistUrl = "https://mirror.nyist.edu.cn/bmclapi/net/minecraftforge/forge/" +
                               mcVersion + "-" + forgeVersion +
                               "/forge-" + mcVersion + "-" + forgeVersion + "-installer.jar";
                
                cb(forgeUrl, [bmclapiUrl, nyistUrl]);
            } else {
                cb(false);
            }
        });
    }
    
    tryNext(0, mcVersion);
};

// Получить список версий ядра Forge для конкретной версии Minecraft
// Для новых версий Forge (начиная с 1.21.9/26.x) используется отдельная нумерация
exports.getForgeVersionsForMC = (minecraftVersion, cb) => {
    // Используем BMCLAPI для получения списка версий Forge для данной версии Minecraft
    let url = "https://bmclapi2.bangbang93.com/forge/minecraft/" + minecraftVersion;
    
    COMMONS.getDataByURL(url, (data) => {
        if (data === false || !Array.isArray(data) || data.length === 0) {
            // Если не удалось получить список, возвращаем просто версию Minecraft
            // (для старых версий Forge где версия ядра = версия Minecraft)
            cb([{
                version: minecraftVersion,
                display: minecraftVersion
            }]);
            return;
        }
        
        // Формируем список версий ядра (от новых к старым)
        let versions = data.map(item => ({
            version: minecraftVersion + "-" + item.version,
            display: item.version,
            forgeVersion: item.version
        }));
        
        cb(versions);
    });
};

// Получить список версий ядра Fabric для конкретной версии Minecraft
exports.getFabricVersionsForMC = (minecraftVersion, cb) => {
    COMMONS.getDataByURL("https://meta.fabricmc.net/v2/versions/loader/" + minecraftVersion, (data) => {
        if (data === false || !Array.isArray(data) || data.length === 0) {
            cb([{
                version: minecraftVersion,
                display: minecraftVersion
            }]);
            return;
        }
        
        // Формируем список версий (loader versions)
        let versions = data.map(item => ({
            version: minecraftVersion + "#" + item.loader.version,
            display: item.loader.version,
            loader: item.loader.version
        }));
        
        cb(versions);
    });
};

/////////////////////////////////////////////////////
/* ФУНКЦИИ ДЛЯ FABRIC */
/////////////////////////////////////////////////////

// Получить список версий Minecraft для Fabric
exports.getAllFabricCores = (cb) => {
    COMMONS.getDataByURL("https://meta.fabricmc.net/v2/versions/game", (data) => {
        if (data === false) {
            LOGGER.warning("Oops! An error occurred while fetching Fabric versions");
            cb(false);
            return;
        }
        if (Array.isArray(data)) {
            // Возвращаем версии игры в обратном порядке (новые первыми)
            let fabricVersions = data.map(v => v.version).reverse();
            cb(fabricVersions);
        } else {
            cb(false);
        }
    });
};

// Получить ссылку на скачивание Fabric server jar
exports.getFabricCoreURL = (version, cb) => {
    let minecraftVersion = version;
    let loaderVersionFromInput = null;

    if (version.includes('#')) {
        const parts = version.split('#');
        minecraftVersion = parts[0];
        loaderVersionFromInput = parts[1];
    }

    // Если версия уже известна, сразу формируем URL
    if (loaderVersionFromInput) {
        let fabricUrl = "https://meta.fabricmc.net/v2/versions/loader/" + 
                       minecraftVersion + "/" + loaderVersionFromInput + "/server/jar";
        
        let bmclapiUrl = "https://bmclapi2.bangbang93.com/fabric-meta/v2/versions/loader/" + 
                        minecraftVersion + "/" + loaderVersionFromInput + "/server/jar";
        
        return cb(fabricUrl, [bmclapiUrl]);
    }

    // Сначала получаем последнюю версию loader для этой версии Minecraft
    COMMONS.getDataByURL("https://meta.fabricmc.net/v2/versions/loader/" + minecraftVersion, (data) => {
        if (data === false || !Array.isArray(data) || data.length === 0) {
            LOGGER.warning("Oops! An error occurred while fetching Fabric loader version");
            cb(false);
            return;
        }
        
        // Берем версию из ввода или первую (последнюю) доступную
        let loaderVersion = loaderVersionFromInput || data[0].loader.version;
        
        // Формируем URL для скачивания server jar (основной + зеркала)
        let fabricUrl = "https://meta.fabricmc.net/v2/versions/loader/" + 
                       minecraftVersion + "/" + loaderVersion + "/server/jar";
        
        // BMCLAPI зеркало (правильный формат из документации)
        let bmclapiUrl = "https://bmclapi2.bangbang93.com/fabric-meta/v2/versions/loader/" + 
                        minecraftVersion + "/" + loaderVersion + "/server/jar";
        
        cb(fabricUrl, [bmclapiUrl]);
    });
};

/////////////////////////////////////////////////////
/* ФУНКЦИИ ДЛЯ NEOFORGE */
/////////////////////////////////////////////////////

// Получить список версий Minecraft для NeoForge
exports.getAllNeoForgeCores = (cb) => {
    // Используем API maven.neoforged.net для получения всех версий или зеркала
    const mainApi = PREDEFINED.SERVER_CORE_MIRRORS.neoforge.versionsApi;
    const mirrors = PREDEFINED.SERVER_CORE_MIRRORS.neoforge.versionsApiMirrors;
    
    COMMONS.getDataByURL(mainApi, (data) => {
        if (data === false) {
            LOGGER.warning("Oops! An error occurred while fetching NeoForge versions");
            cb(false);
            return;
        }
        
        // Обработка данных (может быть разный формат у официального API и зеркал)
        let versionsList = [];
        
        if (data && data.versions && Array.isArray(data.versions)) {
            // Официальный формат API
            versionsList = data.versions;
        } else if (Array.isArray(data)) {
            // Формат BMCLAPI list (обычно массив объектов с полем version или просто строки)
            versionsList = data.map(v => typeof v === 'object' ? v.version : v);
        }
        
        if (versionsList.length > 0) {
            // Извлекаем версии Minecraft из версий ядра NeoForge
            // С 26+ (новый формат): 26.1.2 = Minecraft 1.26.1
            // До 26 (старый формат): 21.11.41 = Minecraft 1.21.4 (первая цифра minor = patch)
            let mcVersions = new Set();
            for (let version of versionsList) {
                // Принимаем версии с 3+ частями (26.1.2, 26.1.2.42-beta, 21.11.41)
                let match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
                if (match) {
                    let major = parseInt(match[1]);  // 26 или 21
                    let minor = match[2];  // 1 или 11
                    let mcVersion;
                    
                    if (major >= 26) {
                        // Новый формат: 26.1.2 = Minecraft 1.26.1
                        mcVersion = `1.${major}.${minor}`;
                    } else {
                        // Старый формат: 21.11.41 = Minecraft 1.21.4 (первая цифра minor)
                        let patch = minor.charAt(0);
                        mcVersion = `1.${major}.${patch}`;
                    }
                    mcVersions.add(mcVersion);
                }
            }
            
            if (mcVersions.size === 0) {
                LOGGER.warning("Oops! An error occurred while fetching NeoForge versions");
                cb(false);
                return;
            }
            
            // Сортируем версии от новых к старым с правильной числовой сортировкой
            let sortedVersions = Array.from(mcVersions).sort((a, b) => {
                let parseVersion = (v) => {
                    let parts = v.split('.').map(Number);
                    return parts[0] * 1000000 + parts[1] * 1000 + (parts[2] || 0);
                };
                return parseVersion(b) - parseVersion(a);
            });
            cb(sortedVersions);
        } else {
            cb(false);
        }
    }, mirrors);
};

// Получить список версий ядра NeoForge для конкретной версии Minecraft
exports.getNeoForgeVersionsForMC = (minecraftVersion, cb) => {
    // Используем API maven.neoforged.net для получения всех версий или зеркала
    const mainApi = PREDEFINED.SERVER_CORE_MIRRORS.neoforge.versionsApi;
    const mirrors = PREDEFINED.SERVER_CORE_MIRRORS.neoforge.versionsApiMirrors;

    COMMONS.getDataByURL(mainApi, (data) => {
        if (data === false) {
            LOGGER.warning("Oops! An error occurred while fetching NeoForge versions for MC " + minecraftVersion);
            cb(false);
            return;
        }

        // Обработка данных
        let versionsList = [];
        if (data && data.versions && Array.isArray(data.versions)) {
            versionsList = data.versions;
        } else if (Array.isArray(data)) {
            versionsList = data.map(v => typeof v === 'object' ? v.version : v);
        }
        
        // Парсим версию Minecraft (например "1.26.1" или "1.21.4")
        let mcMatch = minecraftVersion.match(/^1\.(\d+)\.(\d+)$/);
        if (!mcMatch) {
            cb(false);
            return;
        }
        
        let mcMajor = parseInt(mcMatch[1]);  // 26 или 21
        let mcMinor = mcMatch[2];  // 1 или 4
        
        // Фильтруем версии ядра под эту версию Minecraft
        let matchingVersions = [];
        
        for (let version of versionsList) {
            // Принимаем версии с 3+ частями
            let match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
            if (match) {
                let major = parseInt(match[1]);  // 26 или 21
                let minor = match[2];  // 1 или 11
                let patch = match[3];  // 2 или 41
                
                let matches = false;
                if (major >= 26) {
                    matches = (major === mcMajor && minor === mcMinor);
                } else {
                    matches = (major === mcMajor && minor.charAt(0) === mcMinor.charAt(0));
                }
                
                if (matches) {
                    matchingVersions.push({
                        version: minecraftVersion + "#" + version,
                        display: version,
                        build: patch
                    });
                }
            }
        }
        
        if (matchingVersions.length === 0) {
            cb(false);
            return;
        }
        
        // Сортируем от новых к старым по patch версии
        matchingVersions.sort((a, b) => {
            return parseInt(b.build) - parseInt(a.build);
        });
        
        cb(matchingVersions);
    }, mirrors);
};

// Получить ссылку на скачивание NeoForge installer
exports.getNeoForgeCoreURL = (version, cb) => {
    let minecraftVersion = version;
    let neoforgeVersionFromInput = null;

    if (version.includes('#')) {
        const parts = version.split('#');
        minecraftVersion = parts[0];
        neoforgeVersionFromInput = parts[1];
    }

    // Если версия уже известна, сразу формируем URL без запросов к API (важно для работы без VPN)
    if (neoforgeVersionFromInput) {
        // Определяем путь в maven в зависимости от версии Minecraft
        // Для 1.20.1 используется путь forge, для 1.20.2+ используется neoforge
        let isOldNeo = minecraftVersion === "1.20.1";
        let mavenPath = isOldNeo ? "forge" : "neoforge";
        let fileNamePrefix = isOldNeo ? "forge" : "neoforge";
        
        let neoforgeUrl = "https://maven.neoforged.net/releases/net/neoforged/" + mavenPath + "/" + 
                         minecraftVersion + "-" + neoforgeVersionFromInput + 
                         "/" + fileNamePrefix + "-" + minecraftVersion + "-" + neoforgeVersionFromInput + "-installer.jar";
        
        let bmclapiUrl = "https://bmclapi2.bangbang93.com/maven/net/neoforged/" + mavenPath + "/" + 
                        minecraftVersion + "-" + neoforgeVersionFromInput + 
                        "/" + fileNamePrefix + "-" + minecraftVersion + "-" + neoforgeVersionFromInput + "-installer.jar";
        
        return cb(neoforgeUrl, [bmclapiUrl]);
    }

    // Пробуем основной URL и зеркала для получения версии
    let urlsToTry = [
        "https://meta.neoforged.org/api/v2/versions?minecraftVersion=" + minecraftVersion,
        "https://bmclapi2.bangbang93.com/neoforge/versions?minecraftVersion=" + minecraftVersion
    ];
    
    function tryNext(index) {
        if (index >= urlsToTry.length) {
            LOGGER.warning("Oops! An error occurred while fetching NeoForge URL");
            cb(false);
            return;
        }
        
        COMMONS.getDataByURL(urlsToTry[index], (data) => {
            if (data === false || !Array.isArray(data) || data.length === 0) {
                LOGGER.warning("Failed to fetch from " + urlsToTry[index] + ", trying next...");
                tryNext(index + 1);
                return;
            }
            
            // Берем версию из ввода или первую (последнюю) доступную
            let neoforgeVersion = neoforgeVersionFromInput || data[0].version;
            
            // Определяем путь в maven в зависимости от версии Minecraft
            // Для 1.20.1 используется путь forge, для 1.20.2+ используется neoforge
            let isOldNeo = minecraftVersion === "1.20.1";
            let mavenPath = isOldNeo ? "forge" : "neoforge";
            let fileNamePrefix = isOldNeo ? "forge" : "neoforge";
            
            // Формируем URL для installer (основной + зеркала)
            let neoforgeUrl = "https://maven.neoforged.net/releases/net/neoforged/" + mavenPath + "/" + 
                             minecraftVersion + "-" + neoforgeVersion + 
                             "/" + fileNamePrefix + "-" + minecraftVersion + "-" + neoforgeVersion + "-installer.jar";
            
            // BMCLAPI зеркало
            let bmclapiUrl = "https://bmclapi2.bangbang93.com/maven/net/neoforged/" + mavenPath + "/" + 
                            minecraftVersion + "-" + neoforgeVersion + 
                            "/" + fileNamePrefix + "-" + minecraftVersion + "-" + neoforgeVersion + "-installer.jar";
            
            cb(neoforgeUrl, [bmclapiUrl]);
        });
    }
    
    tryNext(0);
};

// Функция для получения списка поддерживаемых версий Minecraft для конкретного ядра
// Это нужно для фильтрации ядер при выборе версии Minecraft
exports.getSupportedMCVersionsForCore = (core, cb) => {
    switch (core) {
        case 'paper':
        case 'waterfall':
        case 'velocity':
            COMMONS.getDataByURL("https://api.papermc.io/v2/projects/" + core, (data) => {
                if (data === false || !data.versions) {
                    cb(false);
                    return;
                }
                cb(data.versions);
            });
            break;
        case 'purpur':
            COMMONS.getDataByURL("https://api.purpurmc.org/v2/purpur/", (data) => {
                if (data === false || !data.versions) {
                    cb(false);
                    return;
                }
                cb(data.versions);
            });
            break;
        case 'magma':
            COMMONS.getDataByURL("https://api.magmafoundation.org/api/v2/allVersions", (data) => {
                if (data === false || !Array.isArray(data)) {
                    cb(false);
                    return;
                }
                cb(data);
            });
            break;
        case 'forge':
            // Для Forge используем ту же логику что и getAllForgeCores
            let urlsToTry = [
                "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json",
                "https://dl.mslmc.cn/forge/promotions_slim.json"
            ];
            function tryNext(index) {
                if (index >= urlsToTry.length) {
                    cb(false);
                    return;
                }
                COMMONS.getDataByURL(urlsToTry[index], (data) => {
                    if (data === false || !data.promos) {
                        tryNext(index + 1);
                        return;
                    }
                    let mcVersions = new Set();
                    for (let key of Object.keys(data.promos)) {
                        let mcVersion = key.replace(/-(recommended|latest)$/, '');
                        mcVersions.add(mcVersion);
                    }
                    cb(Array.from(mcVersions));
                });
            }
            tryNext(0);
            break;
        case 'fabric':
            COMMONS.getDataByURL("https://meta.fabricmc.net/v2/versions/game", (data) => {
                if (data === false || !Array.isArray(data)) {
                    cb(false);
                    return;
                }
                cb(data.map(v => v.version));
            });
            break;
        case 'neoforge':
            const nfApi = PREDEFINED.SERVER_CORE_MIRRORS.neoforge.versionsApi;
            const nfMirrors = PREDEFINED.SERVER_CORE_MIRRORS.neoforge.versionsApiMirrors;
            
            COMMONS.getDataByURL(nfApi, (data) => {
                if (data === false) {
                    cb(false);
                    return;
                }
                
                let versionsList = [];
                if (data && data.versions && Array.isArray(data.versions)) {
                    versionsList = data.versions;
                } else if (Array.isArray(data)) {
                    versionsList = data.map(v => typeof v === 'object' ? v.version : v);
                }

                if (versionsList.length === 0) {
                    cb(false);
                    return;
                }

                // Извлекаем версии Minecraft из версий ядра NeoForge
                let mcVersions = new Set();
                for (let version of versionsList) {
                    let match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
                    if (match) {
                        let major = parseInt(match[1]);
                        let minor = match[2];
                        let mcVersion;
                        
                        if (major >= 26) {
                            mcVersion = `1.${major}.${minor}`;
                        } else {
                            let patch = minor.charAt(0);
                            mcVersion = `1.${major}.${patch}`;
                        }
                        mcVersions.add(mcVersion);
                    }
                }
                // Сортируем от новых к старым с правильной числовой сортировкой
                let sortedVersions = Array.from(mcVersions).sort((a, b) => {
                    let parseVersion = (v) => {
                        let parts = v.split('.').map(Number);
                        return parts[0] * 1000000 + parts[1] * 1000 + (parts[2] || 0);
                    };
                    return parseVersion(b) - parseVersion(a);
                });
                cb(sortedVersions);
            }, nfMirrors);
            break;
        case 'vanilla':
            // Vanilla поддерживает все версии из Mojang API
            exports.getAllMinecraftVersions(cb);
            break;
        case 'spigot':
            // Для Spigot проверяем external URL
            COMMONS.getDataByURL("https://cdn.seeeroy.ru/Kubek/spigots.json", (data) => {
                if (data === false) {
                    cb(false);
                    return;
                }
                cb(Object.keys(data));
            });
            break;
        default:
            cb(false);
            break;
    }
};

// Функция для получения списка сборок (builds) для Paper-like ядра и конкретной версии Minecraft
exports.getPaperBuildsForMCVersion = (core, mcVersion, cb) => {
    let url = "https://api.papermc.io/v2/projects/" + core + "/versions/" + mcVersion;
    COMMONS.getDataByURL(url, (data) => {
        if (data === false || !data.builds || !Array.isArray(data.builds)) {
            cb(false);
            return;
        }
        // Возвращаем список сборок (от новых к старым)
        cb(data.builds.slice().reverse().map(build => ({
            build: build,
            version: mcVersion,
            display: mcVersion + " (build " + build + ")"
        })));
    });
};

// Получить список версий Minecraft из API Mojang
exports.getAllMinecraftVersions = (cb) => {
    const url = "https://launchermeta.mojang.com/mc/game/version_manifest.json";
    COMMONS.getDataByURL(url, (data) => {
        if (data === false || !data.versions) {
            LOGGER.warning("Failed to fetch Minecraft versions from Mojang API");
            cb(false);
            return;
        }
        // Фильтруем только релизы (не snapshot и не beta/alpha)
        const releases = data.versions
            .filter(v => v.type === "release")
            .map(v => v.id)
            .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
        cb(releases);
    });
};
