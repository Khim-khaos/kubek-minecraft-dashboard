const COMMONS = require('./commons');
const LOGGER = require("./logger");

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
        if (data === false) {
            LOGGER.warning("Oops! An error occurred while fetching cores");
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
        if (data === false) {
            LOGGER.warning("Oops! An error occurred while fetching cores");
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
    COMMONS.getDataByURL("https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json", (data) => {
        if (data === false) {
            LOGGER.warning("Oops! An error occurred while fetching Forge versions");
            cb(false);
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
};

// Получить ссылку на скачивание Forge для конкретной версии
exports.getForgeCoreURL = (minecraftVersion, cb) => {
    COMMONS.getDataByURL("https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json", (data) => {
        if (data === false) {
            LOGGER.warning("Oops! An error occurred while fetching Forge URL");
            cb(false);
            return;
        }
        
        // Ищем recommended версию, если нет - latest
        let forgeVersion = data.promos[minecraftVersion + "-recommended"] || 
                          data.promos[minecraftVersion + "-latest"];
        
        if (forgeVersion) {
            // Формируем URL для installer
            let forgeUrl = "https://maven.minecraftforge.net/net/minecraftforge/forge/" + 
                          minecraftVersion + "-" + forgeVersion + 
                          "/forge-" + minecraftVersion + "-" + forgeVersion + "-installer.jar";
            cb(forgeUrl);
        } else {
            cb(false);
        }
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
exports.getFabricCoreURL = (minecraftVersion, cb) => {
    // Сначала получаем последнюю версию loader для этой версии Minecraft
    COMMONS.getDataByURL("https://meta.fabricmc.net/v2/versions/loader/" + minecraftVersion, (data) => {
        if (data === false || !Array.isArray(data) || data.length === 0) {
            LOGGER.warning("Oops! An error occurred while fetching Fabric loader version");
            cb(false);
            return;
        }
        
        // Берем первую (последнюю) версию loader
        let loaderVersion = data[0].loader.version;
        
        // Формируем URL для скачивания server jar
        let fabricUrl = "https://meta.fabricmc.net/v2/versions/loader/" + 
                       minecraftVersion + "/" + loaderVersion + "/server/jar";
        cb(fabricUrl);
    });
};

/////////////////////////////////////////////////////
/* ФУНКЦИИ ДЛЯ NEOFORGE */
/////////////////////////////////////////////////////

// Получить список версий Minecraft для NeoForge
exports.getAllNeoForgeCores = (cb) => {
    COMMONS.getDataByURL("https://meta.neoforged.org/api/v2/versions", (data) => {
        if (data === false) {
            LOGGER.warning("Oops! An error occurred while fetching NeoForge versions");
            cb(false);
            return;
        }
        if (Array.isArray(data)) {
            // Получаем уникальные версии Minecraft
            let mcVersions = new Set();
            for (let item of data) {
                if (item.minecraftVersion) {
                    mcVersions.add(item.minecraftVersion);
                }
            }
            let neoforgeVersions = Array.from(mcVersions).reverse();
            cb(neoforgeVersions);
        } else {
            cb(false);
        }
    });
};

// Получить ссылку на скачивание NeoForge installer
exports.getNeoForgeCoreURL = (minecraftVersion, cb) => {
    COMMONS.getDataByURL("https://meta.neoforged.org/api/v2/versions?minecraftVersion=" + minecraftVersion, (data) => {
        if (data === false || !Array.isArray(data) || data.length === 0) {
            LOGGER.warning("Oops! An error occurred while fetching NeoForge URL");
            cb(false);
            return;
        }
        
        // Берем последнюю версию NeoForge для этой версии Minecraft
        let neoforgeVersion = data[0].version;
        
        // Формируем URL для installer
        let neoforgeUrl = "https://maven.neoforged.net/releases/net/neoforged/forge/" + 
                         minecraftVersion + "-" + neoforgeVersion + 
                         "/forge-" + minecraftVersion + "-" + neoforgeVersion + "-installer.jar";
        cb(neoforgeUrl);
    });
};