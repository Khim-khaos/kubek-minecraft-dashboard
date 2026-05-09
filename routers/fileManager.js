const COMMONS = require("./../modules/commons");
const FILE_MANAGER = require("./../modules/fileManager");
const WEBSERVER = require("../modules/webserver");

const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

// Endpoint сканирования директории или чтения файлов
router.get("/get", WEBSERVER.serversRouterMiddleware, async function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.server, q.path)) {
        res.set("Content-Type", "application/json");
        const rdResult = await FILE_MANAGER.readFile(q.server, q.path);
        // Если путь оказался файлом
        if (rdResult !== false) {
            res.send({
                fileData: rdResult.toString()
            });
            return;
        }
        // Если путь оказался папкой
        const dirRdResult = await FILE_MANAGER.scanDirectory(q.server, q.path);
        res.send(dirRdResult);
    } else {
        res.sendStatus(400);
    }
});

// Endpoint для начала записи файла
router.get("/chunkWrite/start", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.server, q.path)) {
        return res.send(FILE_MANAGER.startChunkyFileWrite(q.server, q.path));
    }
    res.sendStatus(400);
});

// Endpoint для записи чанка в файл
router.post("/chunkWrite/add", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let b = req.body;
    if (COMMONS.isObjectsValid(b.id, b.data)) {
        return res.send(FILE_MANAGER.addFileChunk(b.id, b.data));
    }
    res.sendStatus(400);
});

// Endpoint для окончания записи чанков и сохранения в файл
router.get("/chunkWrite/end", WEBSERVER.serversRouterMiddleware, async function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.id)) {
        const result = await FILE_MANAGER.endChunkyFileWrite(q.id);
        return res.send(result);
    }
    res.sendStatus(400);
});

// Endpoint для удаления
router.get("/delete", WEBSERVER.serversRouterMiddleware, async function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.server, q.path)) {
        res.set("Content-Type", "application/json");
        let fileDeleteResult = await FILE_MANAGER.deleteFile(q.server, q.path);
        let directoryDeleteResult = false;
        if (!fileDeleteResult) {
            directoryDeleteResult = await FILE_MANAGER.deleteEmptyDirectory(q.server, q.path);
        }
        return res.send(fileDeleteResult || directoryDeleteResult);
    }
    res.sendStatus(400);
});

// Endpoint для переименования
router.get("/rename", WEBSERVER.serversRouterMiddleware, async function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.server, q.path, q.newName)) {
        res.set("Content-Type", "application/json");
        const result = await FILE_MANAGER.renameFile(q.server, q.path, q.newName);
        return res.send(result);
    }
    res.sendStatus(400);
});

// Endpoint для создания новой директории
router.get("/newDirectory", WEBSERVER.serversRouterMiddleware, async function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.server, q.path, q.name)) {
        res.set("Content-Type", "application/json");
        const result = await FILE_MANAGER.newDirectory(q.server, q.path, q.name);
        return res.send(result);
    }
    res.sendStatus(400);
});

// Endpoint для скачивания файла
router.get("/download", WEBSERVER.serversRouterMiddleware, async function (req, res) {
    let q = req.query;

    if (COMMONS.isObjectsValid(q.server, q.path)) {
        let fPath = FILE_MANAGER.constructFilePath(q.server, q.path);
        try {
            const stats = await fs.promises.lstat(fPath);
            if (stats.isFile()) {
                return res.download(path.resolve(fPath));
            }
        } catch (e) {}
    }
    res.sendStatus(400);
});

// Endpoint для архивации
router.get("/archive", WEBSERVER.serversRouterMiddleware, async function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.server, q.path, q.name)) {
        res.set("Content-Type", "application/json");
        const result = await FILE_MANAGER.archiveFile(q.server, q.path, q.name);
        return res.send(result);
    }
    res.sendStatus(400);
});

// Endpoint для разархивации
router.get("/unarchive", WEBSERVER.serversRouterMiddleware, async function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.server, q.path)) {
        res.set("Content-Type", "application/json");
        const result = await FILE_MANAGER.unarchiveFile(q.server, q.path);
        return res.send(result);
    }
    res.sendStatus(400);
});

// Endpoint для загрузки файла на сервер
router.post("/upload", WEBSERVER.serversRouterMiddleware, async function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.server, q.path)) {
        let sourceFile;
        // Проверяем присутствие файлов в запросе
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).send("No files were uploaded.");
        }

        sourceFile = req.files["g-file-input"];

        const result = await COMMONS.moveUploadedFile(q.server, sourceFile, "/" + sourceFile.name);
        if (result === true) {
            return res.send(true);
        }
        console.log(result);
        res.sendStatus(400);
    } else {
        return res.sendStatus(400);
    }
});

module.exports.router = router;