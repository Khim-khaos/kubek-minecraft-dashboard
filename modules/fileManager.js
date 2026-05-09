const fs = require("fs");
const fsPromises = fs.promises;
let fileWrites = {};
const {Base64} = require('js-base64');

const SECURITY = require('./security');

const path = require("path");
const AdmZip = require("adm-zip");
const decompress = require("decompress");

// Собрать путь к папке
exports.constructFilePath = (server, filePath) => {
    return path.join(process.cwd(), "servers", server, filePath);
}

// Проверка на path traversal
exports.verifyPathForTraversal = (baseDir, targetPath) => {
    const resolvedBase = path.resolve(baseDir) + path.sep;
    const resolvedTarget = path.resolve(targetPath);
    return resolvedTarget.startsWith(resolvedBase) || resolvedTarget === path.resolve(baseDir);
};

// Получить файлы в директории
exports.scanDirectory = async (server, directory) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, directory);

    if (!this.verifyPathForTraversal(baseDir, fullPath)) {
        return false;
    }

    try {
        const stats = await fsPromises.lstat(fullPath);
        if (stats.isDirectory()) {
            const readResult = await fsPromises.readdir(fullPath);
            let filesResult = [];
            for (const element of readResult) {
                let filePath = path.join(fullPath, element);
                let fileStats = await fsPromises.lstat(filePath);
                let fileItem = {
                    name: element,
                    path: filePath.replace(baseDir, "").replaceAll("\\", "/"),
                    type: fileStats.isDirectory() ? "directory" : "file",
                    size: fileStats.size,
                    modify: fileStats.mtime,
                };
                filesResult.push(fileItem);
            }
            return filesResult;
        }
    } catch (e) {
        return false;
    }
    return false;
};

// Прочитать содержимое файла
exports.readFile = async (server, filePath) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, filePath);

    if (!this.verifyPathForTraversal(baseDir, fullPath)) {
        return false;
    }

    try {
        const stats = await fsPromises.lstat(fullPath);
        if (!stats.isDirectory()) {
            return await fsPromises.readFile(fullPath);
        }
    } catch (e) {
        return false;
    }
    return false;
};

// Записать файл
exports.writeFile = async (server, filePath, data) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, filePath);

    if (!this.verifyPathForTraversal(baseDir, fullPath)) {
        return false;
    }

    try {
        await fsPromises.writeFile(fullPath, data);
        return true;
    } catch (e) {
        return false;
    }
};

// Удалить файл
exports.deleteFile = async (server, filePath) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, filePath);

    if (!this.verifyPathForTraversal(baseDir, fullPath)) {
        return false;
    }

    try {
        const stats = await fsPromises.lstat(fullPath);
        if (!stats.isDirectory()) {
            await fsPromises.unlink(fullPath);
            return true;
        }
    } catch (e) {
        return false;
    }
    return false;
};

// Удалить директорию (пустую)
exports.deleteEmptyDirectory = async (server, filePath) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, filePath);

    if (!this.verifyPathForTraversal(baseDir, fullPath)) {
        return false;
    }

    try {
        const stats = await fsPromises.lstat(fullPath);
        if (stats.isDirectory()) {
            const files = await fsPromises.readdir(fullPath);
            if (files.length === 0) {
                await fsPromises.rmdir(fullPath);
                return true;
            }
        }
    } catch (e) {
        return false;
    }
    return false;
};

// Переименовать файл
exports.renameFile = async (server, filePath, newName) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, filePath);
    let newPath = path.join(path.dirname(fullPath), newName);

    if (!this.verifyPathForTraversal(baseDir, fullPath) || !this.verifyPathForTraversal(baseDir, newPath)) {
        return false;
    }

    try {
        await fsPromises.rename(fullPath, newPath);
        return true;
    } catch (e) {
        return false;
    }
};

// Создать папку
exports.newDirectory = async (server, filePath, name) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = path.join(this.constructFilePath(server, filePath), name);

    if (!this.verifyPathForTraversal(baseDir, fullPath)) {
        return false;
    }

    try {
        await fsPromises.mkdir(fullPath, {
            recursive: true
        });
        return true;
    } catch (e) {
        return false;
    }
};

/* ЗАПИСЬ ФАЙЛОВ ПО ЧАНКАМ */
// Начать запись
exports.startChunkyFileWrite = (server, filePath) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, filePath);

    if (!this.verifyPathForTraversal(baseDir, fullPath)) {
        return false;
    }

    let randomUUID = SECURITY.generateSecureID(8);
    fileWrites[randomUUID] = {
        id: randomUUID,
        path: fullPath,
        chunks: []
    }
    return randomUUID;
};

// Дописать чанк
exports.addFileChunk = (id, chunk) => {
    if (typeof fileWrites[id] !== "undefined") {
        fileWrites[id].chunks.push(Buffer.from(chunk, 'base64'));
        return true;
    } else {
        return false;
    }
};

// Архивация (Zip)
exports.archiveFile = async (server, filePath, archiveName) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, filePath);
    let archivePath = path.join(path.dirname(fullPath), archiveName);

    if (!this.verifyPathForTraversal(baseDir, fullPath) || !this.verifyPathForTraversal(baseDir, archivePath)) {
        return false;
    }

    try {
        const zip = new AdmZip();
        const stats = await fsPromises.lstat(fullPath);
        if (stats.isDirectory()) {
            zip.addLocalFolder(fullPath);
        } else {
            zip.addLocalFile(fullPath);
        }
        zip.writeZip(archivePath);
        return true;
    } catch (e) {
        console.error("Archive error:", e);
        return false;
    }
};

// Разархивация (Unzip)
exports.unarchiveFile = async (server, filePath) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, filePath);
    let extractPath = path.dirname(fullPath);

    if (!this.verifyPathForTraversal(baseDir, fullPath)) {
        return false;
    }

    try {
        await decompress(fullPath, extractPath);
        return true;
    } catch (e) {
        console.error("Unarchive error:", e);
        return false;
    }
};

// Завершить запись
exports.endChunkyFileWrite = async (id) => {
    if (typeof fileWrites[id] !== "undefined") {
        try {
            const fileData = Buffer.concat(fileWrites[id].chunks);
            await fsPromises.writeFile(fileWrites[id].path, fileData);
            delete fileWrites[id];
            return true;
        } catch (e) {
            delete fileWrites[id];
            return false;
        }
    } else {
        return false;
    }
};