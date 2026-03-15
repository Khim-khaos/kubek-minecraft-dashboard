const TASK_MANAGER = require("./taskManager");
const PREDEFINED = require("./predefined");
const LOGGER = require("./logger");
const MULTILANG = require("./multiLanguage");

const path = require("path");
const axios = require("axios");
const fs = require("fs");
const decompress = require("decompress");
const colors = require("colors");
const { URL } = require("url");

// Получить axios instance с настройками прокси и правильными заголовками
function getAxiosInstance() {
    const config = {
        timeout: 120000, // 2 минуты таймаут для медленных соединений
        headers: {
            // Притворяемся обычным браузером
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9'
        }
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
    let isComplete = false;
    let activeAttemptId = 0;
    let progressUpdateTimer = null;

    async function tryDownload() {
        if (isComplete) return;
        
        if (currentUrlIndex >= urlsToTry.length) {
            // Все URL перепробованы
            isComplete = true;
            cb(lastError || new Error("Все зеркала недоступны"));
            return null;
        }

        const currentUrl = urlsToTry[currentUrlIndex];
        const attemptId = ++activeAttemptId;
        let dlTaskID = null;
        let downloadComplete = false;
        let receivedBytes = 0;
        let responseStream = null;
        let writeStream = null;
        let abortController = new AbortController();

        const cleanupAttempt = (removeTask = false, destroyStreams = false) => {
            if (downloadTimeout) {
                clearTimeout(downloadTimeout);
                downloadTimeout = null;
            }
            if (progressUpdateTimer) {
                clearInterval(progressUpdateTimer);
                progressUpdateTimer = null;
            }
            if (destroyStreams) {
                if (responseStream && !responseStream.destroyed) {
                    responseStream.destroy();
                }
                if (writeStream && !writeStream.destroyed) {
                    writeStream.destroy();
                }
            }
            if (removeTask && dlTaskID && TASK_MANAGER.isTaskExists(dlTaskID)) {
                TASK_MANAGER.removeTask(dlTaskID);
            }
        };

        const failAttempt = (err) => {
            if (downloadComplete || attemptId !== activeAttemptId) return;
            downloadComplete = true;
            lastError = err || lastError;
            cleanupAttempt(true, true);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (e) {
                LOGGER.warning(`[Download] Could not delete partial file: ${e.message}`);
            }
            currentUrlIndex++;
            tryDownload();
        };

        LOGGER.log(`Попытка загрузки с: ${colors.cyan(currentUrl)} (попытка ${currentUrlIndex + 1}/${urlsToTry.length})`);

        try {
            LOGGER.log(`[Download] Sending request to: ${currentUrl}`);
            let forceIpv4 = false;
            let isForgeHost = false;
            try {
                const host = new URL(currentUrl).hostname;
                if (host === "maven.minecraftforge.net" || host === "files.minecraftforge.net") {
                    forceIpv4 = true;
                    isForgeHost = true;
                }
            } catch (e) {
                // ignore URL parse errors
            }
            const stallTimeoutMs = isForgeHost ? 15000 : 120000;
            
            const {data, headers} = await axiosInstance({
                url: currentUrl,
                method: "GET",
                responseType: "stream",
                timeout: 180000, // 3 минуты таймаут на запрос
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                signal: abortController.signal,
                family: forceIpv4 ? 4 : undefined
            });
            
            LOGGER.log(`[Download] Response headers: content-length=${headers['content-length'] || 'N/A'}, content-type=${headers['content-type'] || 'N/A'}`);
            const contentType = String(headers['content-type'] || '').toLowerCase();
            if (contentType.includes('text/html') || contentType.includes('text/plain')) {
                throw new Error(`Unexpected content-type: ${contentType}`);
            }
            
            const totalSize = parseInt(headers['content-length']) || 0;
            
            if (totalSize === 0) {
                LOGGER.warning(`[Download] Server returned content-length=0, this may cause issues`);
            } else {
                LOGGER.log(`[Download] File size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
            }
            
            // Создаём новую задачу и запоминаем её ID
            dlTaskID = TASK_MANAGER.addNewTask({
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

            responseStream = data;

            responseStream.on('aborted', () => {
                LOGGER.warning(`[Download] Response aborted by server: ${currentUrl}`);
            });

            responseStream.on('close', () => {
                if (!downloadComplete && !isComplete) {
                    LOGGER.warning(`[Download] Response stream closed early: ${currentUrl}`);
                }
            });

            // Таймаут на скачивание (если прогресс не обновляется 2 минуты)
            downloadTimeout = setTimeout(() => {
                if (downloadComplete || attemptId !== activeAttemptId) return;
                LOGGER.warning(`[Download] Timeout for ${currentUrl}, trying next mirror... received=${receivedBytes} bytes`);
                try {
                    abortController.abort();
                } catch (e) {
                    // ignore
                }
                failAttempt(new Error("Download timeout"));
            }, stallTimeoutMs);

            // Периодический лог прогресса (раз в 5 секунд)
            progressUpdateTimer = setInterval(() => {
                if (downloadComplete || attemptId !== activeAttemptId) return;
                if (totalSize > 0) {
                    const pct = Math.round((receivedBytes / totalSize) * 100);
                    LOGGER.log(`[Download] Progress: ${pct}% (${receivedBytes}/${totalSize} bytes)`);
                } else {
                    LOGGER.log(`[Download] Progress: ${receivedBytes} bytes (total unknown)`);
                }
            }, 5000);

            // Каждый чанк обновляем прогресс
            responseStream.on('data', (chunk) => {
                if (downloadComplete || attemptId !== activeAttemptId) return;
                
                receivedBytes += chunk.length;
                
                // Сбрасываем таймаут при получении данных
                if (downloadTimeout) {
                    clearTimeout(downloadTimeout);
                    downloadTimeout = setTimeout(() => {
                        if (downloadComplete || attemptId !== activeAttemptId) return;
                        LOGGER.warning(`[Download] Timeout for ${currentUrl}, trying next mirror... received=${receivedBytes} bytes`);
                        try {
                            abortController.abort();
                        } catch (e) {
                            // ignore
                        }
                        failAttempt(new Error("Download timeout"));
                    }, stallTimeoutMs);
                }
                
                // Проверяем, что задача ещё существует
                if (tasks[dlTaskID]) {
                    tasks[dlTaskID].size.current = receivedBytes;
                    
                    // Если размер неизвестен, показываем прогресс по полученным байтам
                    if (totalSize === 0) {
                        tasks[dlTaskID].progress = Math.min(99, Math.floor(receivedBytes / 1024 / 1024 * 10)); // Примерный прогресс
                    } else {
                        tasks[dlTaskID].progress = Math.round((receivedBytes / totalSize) * 100);
                    }
                }
            });

            responseStream.on('end', () => {
                if (downloadComplete || attemptId !== activeAttemptId) return;
                downloadComplete = true;
                
                cleanupAttempt(false, false);
                
                // Проверяем, что задача ещё существует перед удалением
                if (tasks[dlTaskID]) {
                    TASK_MANAGER.removeTask(dlTaskID);
                }
                
                LOGGER.log(`[Download] Download completed: ${filePath}`);
                isComplete = true;
                cb(true);
            });

            responseStream.on('error', (err) => {
                if (downloadComplete || attemptId !== activeAttemptId) return;
                LOGGER.error(`[Download] Stream error: ${err.message}`);
                failAttempt(err);
            });

            writeStream = fs.createWriteStream(filePath);
            
            writeStream.on('error', (err) => {
                if (downloadComplete || attemptId !== activeAttemptId) return;
                LOGGER.error(`[Download] Write error: ${err.message}`);
                failAttempt(err);
            });
            
            writeStream.on('finish', () => {
                LOGGER.log(`[Download] File write finished: ${filePath}`);
            });

            responseStream.pipe(writeStream);
            return dlTaskID;
        } catch (error) {
            const errMsg = (error && (error.message || error.code || error.toString())) || "Unknown error";
            LOGGER.error(`Ошибка загрузки с ${colors.cyan(currentUrl)}: ${errMsg}`);
            failAttempt(error);
            return null;
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
