const fs = require("fs");
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
exports.scanDirectory = (server, directory, cb) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, directory);

    if (!this.verifyPathForTraversal(baseDir, fullPath)) {
        // Если найден path traversal, то ничего не делаем
        cb(false);
        return;
    }

    if (
        fs.existsSync(fullPath) &&
        fs.lstatSync(fullPath).isDirectory()
    ) {
        fs.readdir(fullPath, function (err, readResult) {
            if (err) throw err;
            if (typeof readResult !== "undefined") {
                let filesResult = [];
                readResult.forEach((element) => {
                    let filePath = path.join(fullPath, element);
                    let fileStats = fs.lstatSync(filePath);
                    let fileItem = {
                        name: element,
                        path: filePath.replace(baseDir, "").replaceAll("\\", "/"),
                        type: fileStats.isDirectory() ? "directory" : "file",
                        size: fileStats.size,
                        modify: fileStats.mtime,
                    };
                    filesResult.push(fileItem);
                });
                cb(filesResult);
                return;
            }
            cb(false);
        });
    } else {
        cb(false);
    }
};

// Прочитать содержимое файла
exports.readFile = (server, filePath, cb) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, filePath);

    if (!this.verifyPathForTraversal(baseDir, fullPath)) {
        // Если найден path traversal, то ничего не делаем
        cb(false);
        return;
    }

    if (fs.existsSync(fullPath) && !fs.lstatSync(fullPath).isDirectory()) {
        fs.readFile(fullPath, (err, data) => {
            if (err) throw err;
            cb(data);
        });
    } else {
        cb(false);
    }
};

// Записать файл
exports.writeFile = (server, filePath, data) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, filePath);

    if (!this.verifyPathForTraversal(baseDir, fullPath)) {
        // Если найден path traversal, то ничего не делаем
        return false;
    }

    fs.writeFileSync(fullPath, data);
    return true;
};

// Удалить файл
exports.deleteFile = (server, filePath) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, filePath);

    if (!this.verifyPathForTraversal(baseDir, fullPath)) {
        // Если найден path traversal, то ничего не делаем
        return false;
    }

    if (fs.existsSync(fullPath) && !fs.lstatSync(fullPath).isDirectory()) {
        fs.unlinkSync(fullPath);
        return true;
    }
    return false;
};

// Удалить директорию (пустую)
exports.deleteEmptyDirectory = (server, filePath) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, filePath);

    if (!this.verifyPathForTraversal(baseDir, fullPath)) {
        // Если найден path traversal, то ничего не делаем
        return false;
    }

    if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory() && fs.readdirSync(fullPath).length === 0) {
        fs.rmdirSync(fullPath);
        return true;
    }
    return false;
};

// Переименовать файл
exports.renameFile = (server, filePath, newName) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, filePath);
    let newPath = path.join(path.dirname(fullPath), newName);

    if (!this.verifyPathForTraversal(baseDir, fullPath) || !this.verifyPathForTraversal(baseDir, newPath)) {
        // Если найден path traversal, то ничего не делаем
        return false;
    }

    if (fs.existsSync(fullPath)) {
        fs.renameSync(fullPath, newPath);
        return true;
    }
    return false;
};

// Создать папку
exports.newDirectory = (server, filePath, name) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = path.join(this.constructFilePath(server, filePath), name);

    if (!this.verifyPathForTraversal(baseDir, fullPath)) {
        // Если найден path traversal, то ничего не делаем
        return false;
    }

    fs.mkdirSync(fullPath, {
        recursive: true
    })
};

/* ЗАПИСЬ ФАЙЛОВ ПО ЧАНКАМ */
// Начать запись
exports.startChunkyFileWrite = (server, filePath) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, filePath);

    if (!this.verifyPathForTraversal(baseDir, fullPath)) {
        // Если найден path traversal, то ничего не делаем
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
exports.archiveFile = (server, filePath, archiveName) => {
    let baseDir = path.join(process.cwd(), "servers", server);
    let fullPath = this.constructFilePath(server, filePath);
    let archivePath = path.join(path.dirname(fullPath), archiveName);

    if (!this.verifyPathForTraversal(baseDir, fullPath) || !this.verifyPathForTraversal(baseDir, archivePath)) {
        return false;
    }

    try {
        const zip = new AdmZip();
        if (fs.lstatSync(fullPath).isDirectory()) {
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
exports.endChunkyFileWrite = (id) => {
    if (typeof fileWrites[id] !== "undefined") {
        const fileData = Buffer.concat(fileWrites[id].chunks);
        fs.writeFileSync(fileWrites[id].path, fileData);
        delete fileWrites[id];
        return true;
    } else {
        return false;
    }
};