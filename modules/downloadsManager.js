const TASK_MANAGER = require("./taskManager");
const PREDEFINED = require("./predefined");
const LOGGER = require("./logger");
const MULTILANG = require("./multiLanguage");

const path = require("path");
const axios = require("axios");
const fs = require("fs");
const decompress = require("decompress");
const colors = require("colors");

// Получить axios instance с настройками прокси
function getAxiosInstance() {
    const config = {
        timeout: 30000,
    };

    // Если прокси включён, добавляем агент
    if (mainConfig && mainConfig.proxy && mainConfig.proxy.enabled) {
        const { host, port, username, password } = mainConfig.proxy;
        if (host && port) {
            let proxyUrl = `http://${host}:${port}`;
            if (username && password) {
                proxyUrl = `http://${username}:${password}@${host}:${port}`;
            }
            // Используем динамический require для совместимости
            const { HttpProxyAgent } = require("http-proxy-agent");
            const { HttpsProxyAgent } = require("https-proxy-agent");
            config.httpsAgent = new HttpsProxyAgent(proxyUrl);
            config.httpAgent = new HttpProxyAgent(proxyUrl);
        }
    }

    return axios.create(config);
}

// Создать задачу на скачивание (с поддержкой зеркал)
async function addDownloadTask(downloadURL, filePath, cb = () => {}, mirrors = []) {
    const axiosInstance = getAxiosInstance();
    
    // Список URL для попытки (основной + зеркала)
    const urlsToTry = [downloadURL, ...mirrors];
    let currentUrlIndex = 0;
    let lastError = null;

    async function tryDownload() {
        if (currentUrlIndex >= urlsToTry.length) {
            // Все URL перепробованы
            cb(lastError || new Error("Все зеркала недоступны"));
            return null;
        }

        const currentUrl = urlsToTry[currentUrlIndex];
        LOGGER.log(`Попытка загрузки с: ${colors.cyan(currentUrl)} (попытка ${currentUrlIndex + 1}/${urlsToTry.length})`);

        try {
            const {data, headers} = await axiosInstance({
                url: currentUrl,
                method: "GET",
                responseType: "stream",
            });

            // Создаём новую задачу и запоминаем её ID
            let dlTaskID = TASK_MANAGER.addNewTask({
                type: PREDEFINED.TASKS_TYPES.DOWNLOADING,
                progress: 0,
                size: {
                    total: parseInt(headers['content-length']) || 0,
                    current: 0
                },
                url: currentUrl,
                path: filePath,
                filename: path.basename(filePath)
            });

            LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.downloadTaskCreated}}", colors.cyan(dlTaskID), colors.cyan(path.basename(filePath))));

            // Каждый чанк обновляем прогресс
            data.on('data', (chunk) => {
                tasks[dlTaskID].size.current = tasks[dlTaskID].size.current + chunk.length;
                tasks[dlTaskID].progress = Math.round((tasks[dlTaskID].size.current / tasks[dlTaskID].size.total) * 100);
                if (tasks[dlTaskID].size.current === tasks[dlTaskID].size.total) {
                    // Возвращаем коллбэк после окончания скачивания
                    TASK_MANAGER.removeTask(dlTaskID);
                    cb(true);
                }
            });

            data.pipe(fs.createWriteStream(filePath));
            return dlTaskID;
        } catch (error) {
            lastError = error;
            LOGGER.error(`Ошибка загрузки с ${colors.cyan(currentUrl)}: ${error.message}`);
            currentUrlIndex++;
            return tryDownload();
        }
    }

    return tryDownload();
}

// Распаковать архив по нужному пути
exports.unpackArchive = (archivePath, unpackPath, cb, deleteAfterUnpack = false) => {
    fs.mkdirSync(unpackPath, {recursive: true});
    decompress(archivePath, unpackPath)
        .then(function () {
            if (deleteAfterUnpack) {
                fs.unlinkSync(archivePath);
            }
            cb(true);
        })
        .catch(function (error) {
            console.error(error);
            cb(false);
        });
}

module.exports.addDownloadTask = addDownloadTask;
