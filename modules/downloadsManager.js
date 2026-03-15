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
        timeout: 120000, // 2 минуты таймаут для медленных соединений
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

// Создать задачу на скачивание (с поддержкой зеркал и таймаутом)
async function addDownloadTask(downloadURL, filePath, cb = () => {}, mirrors = []) {
    const axiosInstance = getAxiosInstance();

    // Список URL для попытки (основной + зеркала)
    const urlsToTry = [downloadURL, ...mirrors];
    let currentUrlIndex = 0;
    let lastError = null;
    let downloadTimeout = null;

    async function tryDownload() {
        if (currentUrlIndex >= urlsToTry.length) {
            // Все URL перепробованы
            cb(lastError || new Error("Все зеркала недоступны"));
            return null;
        }

        const currentUrl = urlsToTry[currentUrlIndex];
        LOGGER.log(`Попытка загрузки с: ${colors.cyan(currentUrl)} (попытка ${currentUrlIndex + 1}/${urlsToTry.length})`);

        try {
            LOGGER.log(`[Download] Sending request to: ${currentUrl}`);
            
            const {data, headers} = await axiosInstance({
                url: currentUrl,
                method: "GET",
                responseType: "stream",
                timeout: 180000, // 3 минуты таймаут на запрос
            });
            
            LOGGER.log(`[Download] Response headers: content-length=${headers['content-length'] || 'N/A'}, content-type=${headers['content-type'] || 'N/A'}`);
            
            const totalSize = parseInt(headers['content-length']) || 0;
            
            if (totalSize === 0) {
                LOGGER.warning(`[Download] Server returned content-length=0, this may cause issues`);
            } else {
                LOGGER.log(`[Download] File size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
            }
            
            // Создаём новую задачу и запоминаем её ID
            let dlTaskID = TASK_MANAGER.addNewTask({
                type: PREDEFINED.TASKS_TYPES.DOWNLOADING,
                progress: 0,
                size: {
                    total: totalSize,
                    current: 0
                },
                url: currentUrl,
                path: filePath,
                filename: path.basename(filePath)
            });

            LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.downloadTaskCreated}}", colors.cyan(dlTaskID), colors.cyan(path.basename(filePath))));

            let receivedBytes = 0;
            let progressUpdateTimer = null;

            // Таймаут на скачивание (если прогресс не обновляется 2 минуты)
            downloadTimeout = setTimeout(() => {
                LOGGER.warning(`[Download] Timeout for ${currentUrl}, trying next mirror...`);
                if (progressUpdateTimer) clearInterval(progressUpdateTimer);
                downloadTimeout = null;
                currentUrlIndex++;
                tryDownload();
            }, 120000);

            // Каждый чанк обновляем прогресс
            data.on('data', (chunk) => {
                receivedBytes += chunk.length;
                
                // Сбрасываем таймаут при получении данных
                if (downloadTimeout) {
                    clearTimeout(downloadTimeout);
                    downloadTimeout = setTimeout(() => {
                        LOGGER.warning(`[Download] Timeout for ${currentUrl}, trying next mirror...`);
                        if (progressUpdateTimer) clearInterval(progressUpdateTimer);
                        downloadTimeout = null;
                        currentUrlIndex++;
                        tryDownload();
                    }, 120000);
                }
                
                tasks[dlTaskID].size.current = receivedBytes;
                
                // Если размер неизвестен, показываем прогресс по полученным байтам
                if (totalSize === 0) {
                    tasks[dlTaskID].progress = Math.min(99, Math.floor(receivedBytes / 1024 / 1024 * 10)); // Примерный прогресс
                } else {
                    tasks[dlTaskID].progress = Math.round((receivedBytes / totalSize) * 100);
                }
                
                if (tasks[dlTaskID].progress >= 100 || (totalSize === 0 && receivedBytes > 0)) {
                    // Возвращаем коллбэк после окончания скачивания
                    if (downloadTimeout) clearTimeout(downloadTimeout);
                    if (progressUpdateTimer) clearInterval(progressUpdateTimer);
                    TASK_MANAGER.removeTask(dlTaskID);
                    cb(true);
                }
            });

            data.on('end', () => {
                if (downloadTimeout) clearTimeout(downloadTimeout);
                if (progressUpdateTimer) clearInterval(progressUpdateTimer);
                TASK_MANAGER.removeTask(dlTaskID);
                cb(true);
            });

            data.pipe(fs.createWriteStream(filePath));
            return dlTaskID;
        } catch (error) {
            if (downloadTimeout) clearTimeout(downloadTimeout);
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
