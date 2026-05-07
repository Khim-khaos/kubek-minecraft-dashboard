const PREDEFINED = require("./../modules/predefined");
const CORES_MANAGER = require("./../modules/coresManager");
const CORES_URL_GEN = require("./../modules/coresURLGenerator");
const COMMONS = require("./../modules/commons");
const WEBSERVER = require("../modules/webserver");

const express = require("express");
const router = express.Router();

// Endpoint списка ядер
router.get("/", function (req, res) {
    res.set("Content-Type", "application/json");
    res.send(PREDEFINED.SERVER_CORES);
});

// Endpoint списка версий Minecraft
router.get("/minecraft-versions", function (req, res) {
    res.set("Content-Type", "application/json");
    CORES_URL_GEN.getAllMinecraftVersions((versions) => {
        if (versions === false) {
            res.sendStatus(500);
            return;
        }
        res.send(versions);
    });
});

// Endpoint получения ядер, поддерживающих конкретную версию Minecraft
router.get("/for-mc-version/:version", function (req, res) {
    let mcVersion = req.params.version;
    if (!COMMONS.isObjectsValid(mcVersion)) {
        res.sendStatus(400);
        return;
    }
    
    res.set("Content-Type", "application/json");
    let allCores = PREDEFINED.SERVER_CORES;
    let supportedCores = [];
    let pendingChecks = Object.keys(allCores).length;
    
    if (pendingChecks === 0) {
        res.send([]);
        return;
    }
    
    Object.entries(allCores).forEach(([coreId, coreInfo]) => {
        CORES_MANAGER.getSupportedMCVersionsForCore(coreId, (versions) => {
            pendingChecks--;
            
            if (versions !== false && Array.isArray(versions) && versions.includes(mcVersion)) {
                supportedCores.push({
                    id: coreId,
                    ...coreInfo
                });
            }
            
            // Когда все проверки завершены
            if (pendingChecks === 0) {
                res.send(supportedCores);
            }
        });
    });
});

// Endpoint получения версий/сборок ядра для конкретной версии Minecraft
router.get("/:core/for-mc-version/:mcversion", function (req, res) {
    let core = req.params.core;
    let mcVersion = req.params.mcversion;
    
    if (!COMMONS.isObjectsValid(core, mcVersion) || !Object.keys(PREDEFINED.SERVER_CORES).includes(core)) {
        res.sendStatus(400);
        return;
    }
    
    res.set("Content-Type", "application/json");
    CORES_MANAGER.getCoreVersionsForMCVersion(core, mcVersion, (result) => {
        if (result === false) {
            res.sendStatus(500);
            return;
        }
        res.send(result);
    });
});

// Endpoint списка версий конкретного ядра
router.get("/:core", function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.core) && Object.keys(PREDEFINED.SERVER_CORES).includes(q.core)) {
        res.set("Content-Type", "application/json");
        CORES_MANAGER.getCoreVersions(q.core, (result) => {
            res.send(result);
        });
    } else {
        res.sendStatus(400);
    }
});

// Endpoint ссылки на выбранную версию ядра
router.get("/:core/:version", function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.core, q.version) && Object.keys(PREDEFINED.SERVER_CORES).includes(q.core)) {
        CORES_MANAGER.getCoreVersionURL(q.core, q.version, (result) => {
            res.send(result);
        });
    } else {
        res.sendStatus(400);
    }
});

// Endpoint для загрузки ядра
router.post("/:server", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    let sourceFile;
    // Проверяем присутствие файлов в запросе
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send("No files were uploaded.");
    }

    sourceFile = req.files["server-core-input"];

    COMMONS.moveUploadedFile(q.server, sourceFile, "/" + sourceFile.name, (result) => {
        if (result === true) {
            return res.send(true);
        }
        console.log(result);
        res.sendStatus(400);
    })
});

module.exports.router = router;