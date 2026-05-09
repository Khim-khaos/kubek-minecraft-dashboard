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
        
        // Получаем зеркала из PREDEFINED
        const forgeMirrors = PREDEFINED.SERVER_CORE_MIRRORS.forge.mirrors;
        const mirrors = forgeMirrors.map(m => m + mcVersion + "-" + forgeVersionFromInput + "/forge-" + mcVersion + "-" + forgeVersionFromInput + "-installer.jar");
        
        return cb(forgeUrl, mirrors);
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
                
                // Получаем зеркала из PREDEFINED
                const forgeMirrors = PREDEFINED.SERVER_CORE_MIRRORS.forge.mirrors;
                const mirrors = forgeMirrors.map(m => m + mcVersion + "-" + forgeVersion + "/forge-" + mcVersion + "-" + forgeVersion + "-installer.jar");
                
                cb(forgeUrl, mirrors);
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
    // Пробуем зеркала для получения списка версий
    let urlsToTry = [
        "https://bmclapi2.bangbang93.com/forge/minecraft/" + minecraftVersion
    ];

    function tryNext(index) {
        if (index >= urlsToTry.length) {
            // Если не удалось получить список, возвращаем просто версию Minecraft
            cb([{
                version: minecraftVersion,
                display: minecraftVersion
            }]);
            return;
        }

        COMMONS.getDataByURL(urlsToTry[index], (data) => {
            if (data === false || !Array.isArray(data) || data.length === 0) {
                tryNext(index + 1);
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
    }
    
    tryNext(0);
};

// Получить список версий ядра Fabric для конкретной версии Minecraft
exports.getFabricVersionsForMC = (minecraftVersion, cb) => {
    // Пробуем зеркала для получения списка версий
    let urlsToTry = [
        "https://meta.fabricmc.net/v2/versions/loader/" + minecraftVersion,
        "https://bmclapi2.bangbang93.com/fabric-meta/v2/versions/loader/" + minecraftVersion
    ];

    function tryNext(index) {
        if (index >= urlsToTry.length) {
            cb([{
                version: minecraftVersion,
                display: minecraftVersion
            }]);
            return;
        }

        COMMONS.getDataByURL(urlsToTry[index], (data) => {
            if (data === false || !Array.isArray(data) || data.length === 0) {
                tryNext(index + 1);
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
    }

    tryNext(0);
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
        
        // Получаем зеркала из PREDEFINED
        const fabricMirrors = PREDEFINED.SERVER_CORE_MIRRORS.fabric.mirrors;
        const mirrors = fabricMirrors.map(m => m + "v2/versions/loader/" + minecraftVersion + "/" + loaderVersionFromInput + "/server/jar");
        
        return cb(fabricUrl, mirrors);
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
        
        // Получаем зеркала из PREDEFINED
        const fabricMirrors = PREDEFINED.SERVER_CORE_MIRRORS.fabric.mirrors;
        const mirrors = fabricMirrors.map(m => m + "v2/versions/loader/" + minecraftVersion + "/" + loaderVersion + "/server/jar");
        
        cb(fabricUrl, mirrors);
    });
};

/////////////////////////////////////////////////////
/* ФУНКЦИИ ДЛЯ NEOFORGE */
/////////////////////////////////////////////////////

// Получить список версий Minecraft для NeoForge
exports.getAllNeoForgeCores = (cb) => {
    // Используем API maven.neoforged.net для получения всех версий или зеркала
    const mainApi = PREDEFINED.SERVER_CORE_MIRRORS.neoforge.versionsApi;
    // Для общего списка версий BMCLAPI не очень подходит без указания MC версии,
    // но мы можем попробовать получить список для популярных версий или использовать основной API
    const mirrors = PREDEFINED.SERVER_CORE_MIRRORS.neoforge.versionsApiMirrors;
    
    COMMONS.getDataByURL(mainApi, (data) => {
        if (data === false) {
            cb(false);
            return;
        }
        
        let versionsList = [];
        if (data && data.versions && Array.isArray(data.versions)) {
            versionsList = data.versions;
        }
        
        if (versionsList.length > 0) {
            let mcVersions = new Set();
            for (let version of versionsList) {
                let match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
                if (match) {
                    let major = parseInt(match[1]);
                    let minor = parseInt(match[2]);
                    let mcVersion;
                    
                    if (minor === 0) {
                        mcVersion = `1.${major}`;
                    } else {
                        mcVersion = `1.${major}.${minor}`;
                    }
                    
                    // Фильтруем явно невозможные версии (например, версии из далекого будущего)
                    if (major > 40) continue; 
                    
                    mcVersions.add(mcVersion);
                }
            }
            
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
    });
};

// Получить список версий ядра NeoForge для конкретной версии Minecraft
exports.getNeoForgeVersionsForMC = (minecraftVersion, cb) => {
    const mainApi = PREDEFINED.SERVER_CORE_MIRRORS.neoforge.versionsApi;
    const mirrors = PREDEFINED.SERVER_CORE_MIRRORS.neoforge.versionsApiMirrors.map(m => m.replace("%mcversion%", minecraftVersion));

    COMMONS.getDataByURL(mainApi, (data) => {
        if (data === false) {
            LOGGER.warning("Oops! An error occurred while fetching NeoForge versions for MC " + minecraftVersion);
            cb(false);
            return;
        }

        let versionsList = [];
        if (data && data.versions && Array.isArray(data.versions)) {
            // Формат официального API: { versions: ["21.1.228", ...] }
            versionsList = data.versions;
        } else if (Array.isArray(data)) {
            // Формат BMCLAPI: [{ version: "21.1.228", ... }, ...]
            versionsList = data.map(v => typeof v === 'object' ? v.version : v);
        }
        
        let mcMatch = minecraftVersion.match(/^1\.(\d+)\.(\d+)$/);
        if (!mcMatch) {
            cb(false);
            return;
        }
        
        let mcMajor = parseInt(mcMatch[1]);
        let mcMinor = mcMatch[2];
        
        let matchingVersions = [];
        for (let version of versionsList) {
            let match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
            if (match) {
                    let major = parseInt(match[1]);
                    let minor = parseInt(match[2]);
                    let patch = match[3];
                    
                    let mcVersionFromNeo;
                    if (minor === 0) {
                        mcVersionFromNeo = `1.${major}`;
                    } else {
                        mcVersionFromNeo = `1.${major}.${minor}`;
                    }

                    if (mcVersionFromNeo === minecraftVersion) {
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
        
        matchingVersions.sort((a, b) => parseInt(b.build) - parseInt(a.build));
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
        let isOldNeo = minecraftVersion === "1.20.1";
        let mavenPath = isOldNeo ? "forge" : "neoforge";
        let fileNamePrefix = isOldNeo ? "forge" : "neoforge";
        
        // Получаем базовые зеркала из PREDEFINED
        const nfMirrors = PREDEFINED.SERVER_CORE_MIRRORS.neoforge.mirrors;
        
        // Формируем полные URL для всех зеркал
        // Мы заменяем базовый путь /neoforge/ на версию и имя файла
        let urls = nfMirrors.map(mirrorBase => {
            // Если в зеркале уже есть правильный путь (с neoforge или forge в конце)
            // Мы просто добавляем версию и файл
            return mirrorBase.replace(/\/neoforge\/$/, `/${mavenPath}/`) + 
                   neoforgeVersionFromInput + "/" + fileNamePrefix + "-" + neoforgeVersionFromInput + "-installer.jar";
        });
        
        // Добавляем официальный репозиторий в конец если его там нет
        const officialUrl = "https://maven.neoforged.net/releases/net/neoforged/" + mavenPath + "/" + 
                           neoforgeVersionFromInput + "/" + fileNamePrefix + "-" + neoforgeVersionFromInput + "-installer.jar";
        
        if (!urls.includes(officialUrl)) {
            urls.push(officialUrl);
        }
        
        // Сортируем зеркала на основе тестов скорости (BMCLAPI > University > Official > ForgeCDN)
        urls.sort((a, b) => {
            const getPriority = (url) => {
                if (url.includes("bmclapi2.bangbang93.com")) return 1;
                if (url.includes("mirror.sjtu.edu.cn") || url.includes("mirrors.qlu.edu.cn") || url.includes("mirror.nyist.edu.cn")) return 2;
                if (url.includes("neoforged.net")) return 3;
                if (url.includes("forgecdn.net")) return 4;
                return 5;
            };
            return getPriority(a) - getPriority(b);
        });

        return cb(urls[0], urls.slice(1));
    }

    // Пробуем основной URL и зеркала для получения версии
    let urlsToTry = [
        "https://meta.neoforged.org/api/v2/versions?minecraftVersion=" + minecraftVersion,
        ...PREDEFINED.SERVER_CORE_MIRRORS.neoforge.versionsApiMirrors.map(m => m.replace("%mcversion%", minecraftVersion))
    ];
    
    function tryNext(index) {
        if (index >= urlsToTry.length) {
            LOGGER.warning("Oops! An error occurred while fetching NeoForge URL");
            cb(false);
            return;
        }
        
        COMMONS.getDataByURL(urlsToTry[index], (data) => {
            if (data === false || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && !data.version && !Array.isArray(data))) {
                LOGGER.warning("Failed to fetch from " + urlsToTry[index] + ", trying next...");
                tryNext(index + 1);
                return;
            }
            
            // Берем версию из ввода или первую (последнюю) доступную
            let neoforgeVersion = neoforgeVersionFromInput;
            
            if (!neoforgeVersion) {
                if (Array.isArray(data)) {
                    // BMCLAPI или MCI Mirror возвращают массив
                    neoforgeVersion = data[0].version || data[0];
                } else if (data.version) {
                    // Официальный API возвращает объект
                    neoforgeVersion = data.version;
                }
            }
            
            if (!neoforgeVersion) {
                tryNext(index + 1);
                return;
            }

            // Вызываем саму себя с уже известной версией для формирования списка зеркал
            exports.getNeoForgeCoreURL(minecraftVersion + "#" + neoforgeVersion, cb);
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
                        let minor = parseInt(match[2]);
                        let mcVersion;
                        
                        if (minor === 0) {
                            mcVersion = `1.${major}`;
                        } else {
                            mcVersion = `1.${major}.${minor}`;
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
