const TASK_MANAGER = require("./taskManager");
const CORES_MANAGER = require("./coresManager");
const JAVA_MANAGER = require("./javaManager");
const DOWNLOADS_MANAGER = require("./downloadsManager");
const SERVERS_MANAGER = require("./serversManager");
const PREDEFINED = require("./predefined");
const CONFIGURATION = require("./configuration");
const LOGGER = require("./logger");
const MULTILANG = require("./multiLanguage");

const fs = require("fs");
const path = require("path");
const colors = require("colors");

async function prepareJavaForServer(javaVersion, cb) {
    let javaExecutablePath = "";
    let javaDownloadURL = "";
    let isJavaNaN = isNaN(parseInt(javaVersion));

    if (isJavaNaN && fs.existsSync(javaVersion)) {
        // Если в аргументе указан путь к существующему файла Java
        javaExecutablePath = javaVersion;
    } else if (!isJavaNaN) {
        // Если передана версия Java, то не делаем ничего
    } else {
        // Если версия Java не была передана
        cb(false);
        return;
    }

    // Если в javaVersion указана версия Java, а не путь
    if (!isJavaNaN) {
        javaExecutablePath = JAVA_MANAGER.getJavaPath(javaVersion);

        // Если мы не смогли найти нужную версию Java в папке
        if (javaExecutablePath === false) {
            let javaVerInfo = JAVA_MANAGER.getJavaInfoByVersion(javaVersion);
            javaDownloadURL = javaVerInfo.url;

            // Начинаем скачивание нужной версии Java
            DOWNLOADS_MANAGER.addDownloadTask(javaDownloadURL, javaVerInfo.downloadPath, (javaDlResult) => {
                if (javaDlResult === true) {
                    // Если скачивание успешно завершено, то распаковываем
                    DOWNLOADS_MANAGER.unpackArchive(javaVerInfo.downloadPath, javaVerInfo.unpackPath, (javaUnpackResult) => {
                        if (javaUnpackResult === true) {
                            // Если всё успешно распаковалось - просто перезапускаем создание сервера с теми же параметрами
                            javaExecutablePath = JAVA_MANAGER.getJavaPath(javaVersion);
                            cb(javaExecutablePath);
                        } else {
                            LOGGER.warning(MULTILANG.translateText(mainConfig.language, "{{console.javaUnpackFailed}}"));
                            cb(false);
                        }
                    }, true);
                } else {
                    LOGGER.warning(MULTILANG.translateText(mainConfig.language, "{{console.javaDownloadFailed}}"));
                    cb(false);
                }
            }, javaVerInfo.mirrors || []);
        } else {
            cb(javaExecutablePath);
        }
    } else {
        cb(javaExecutablePath);
    }
}

// Функция для запуска создания сервера Java
async function startJavaServerGeneration(serverName, core, coreVersion, startParameters, javaExecutablePath, serverPort, cb) {
    let coreDownloadURL = "";
    let coreFileName = core + "-" + coreVersion + ".jar";
    
    // Определяем, является ли ядро установщиком (Forge, Fabric, NeoForge)
    let isInstaller = ["forge", "fabric", "neoforge"].includes(core.toLowerCase());
    if (isInstaller) {
        coreFileName = core + "-" + coreVersion + "-installer.jar";
    }

    // Создаём задачу на создание сервера
    let creationTaskID = TASK_MANAGER.addNewTask({
        type: PREDEFINED.TASKS_TYPES.CREATING,
        serverName: serverName,
        core: core,
        coreVersion: coreVersion,
        startParameters: startParameters,
        javaExecutablePath: javaExecutablePath,
        currentStep: null
    })

    // Если сервер с таким названием уже существует - не продолжаем
    if (SERVERS_MANAGER.isServerExists(serverName)) {
        cb(false);
        return false;
    }

    if (javaExecutablePath !== false) {
        // Создаём весь путь для сервера
        let serverDirectoryPath = "./servers/" + serverName;
        fs.mkdirSync(serverDirectoryPath, {recursive: true});

        if (core.match(/\:\/\//gim) === null && fs.existsSync("./servers/" + serverName + path.sep + core)) {
            // ЕСЛИ ЯДРО РАСПОЛОЖЕНО ЛОКАЛЬНО
            tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.COMPLETED;
            // Добавляем новый сервер в конфиг
            serversConfig[serverName] = {
                status: PREDEFINED.SERVER_STATUSES.STOPPED,
                restartOnError: true,
                maxRestartAttempts: 3,
                game: "minecraft",
                minecraftType: "java",
                stopCommand: "stop"
            };
            // DEVELOPED by seeeroy
            CONFIGURATION.writeServersConfig(serversConfig);
            this.writeJavaStartFiles(serverName, core, startParameters, javaExecutablePath, serverPort, core);
            LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.serverCreatedSuccess}}", colors.cyan(serverName)));
            cb(true);
        } else {
            // ЕСЛИ ЯДРО НУЖНО СКАЧИВАТЬ
            tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.SEARCHING_CORE;
            CORES_MANAGER.getCoreVersionURL(core, coreVersion, (url, mirrors = []) => {
                coreDownloadURL = url;
                tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.CHECKING_JAVA;
                // Скачиваем ядро для сервера (с поддержкой зеркал)
                tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.DOWNLOADING_CORE;

                // Получаем зеркала для этого типа ядра
                let coreMirrors = [];
                
                // Сначала добавляем зеркала из API (если есть)
                if (Array.isArray(mirrors) && mirrors.length > 0) {
                    coreMirrors = mirrors;
                }
                
                // Затем добавляем зеркала из конфига
                const coreKey = core.toLowerCase();
                if (PREDEFINED.SERVER_CORE_MIRRORS[coreKey]) {
                    coreMirrors = coreMirrors.concat(PREDEFINED.SERVER_CORE_MIRRORS[coreKey].mirrors || []);
                }

                DOWNLOADS_MANAGER.addDownloadTask(coreDownloadURL, serverDirectoryPath + path.sep + coreFileName, (coreDlResult) => {
                    if (coreDlResult === true) {
                        // Если это installer (Forge/Fabric/NeoForge), запускаем установку
                        if (isInstaller) {
                            tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.INSTALLING;
                            
                            let installerArgs = "--installServer";
                            let fullJavaPath = path.resolve(javaExecutablePath);
                            
                            // Запускаем installer
                            const { exec } = require('child_process');
                            let installProcess = exec('"' + fullJavaPath + '" -jar "' + coreFileName + '" ' + installerArgs, {
                                cwd: serverDirectoryPath
                            });
                            
                            installProcess.on('exit', (code) => {
                                LOGGER.log("[Installer] Installer exited with code: " + code);
                                
                                if (code === 0 || code === null) {
                                    // Установка успешна, определяем имя целевого JAR файла
                                    LOGGER.log("[Installer] Installation completed, searching for server jar...");
                                    let targetCoreJar = findServerJar(serverDirectoryPath, core);
                                    
                                    if (targetCoreJar) {
                                        LOGGER.log("[Installer] Found server jar: " + targetCoreJar);
                                        
                                        // Удаляем installer после успешной установки (с задержкой)
                                        setTimeout(() => {
                                            try {
                                                let installerPath = serverDirectoryPath + path.sep + coreFileName;
                                                if (fs.existsSync(installerPath)) {
                                                    fs.unlinkSync(installerPath);
                                                    LOGGER.log("[Installer] Installer file deleted: " + coreFileName);
                                                }
                                            } catch (e) {
                                                // Файл может быть ещё заблокирован, не критично
                                                LOGGER.warning("[Installer] Could not delete installer file (may be locked): " + e.message);
                                            }
                                        }, 2000); // Ждём 2 секунды перед удалением
                                        
                                        tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.COMPLETED;
                                        // Добавляем новый сервер в конфиг
                                        serversConfig[serverName] = {
                                            status: PREDEFINED.SERVER_STATUSES.STOPPED,
                                            restartOnError: true,
                                            maxRestartAttempts: 3,
                                            game: "minecraft",
                                            minecraftType: "java",
                                            stopCommand: "stop"
                                        };
                                        CONFIGURATION.writeServersConfig(serversConfig);
                                        this.writeJavaStartFiles(serverName, targetCoreJar, startParameters, javaExecutablePath, serverPort, core);
                                        LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.serverCreatedSuccess}}", colors.cyan(serverName)));
                                        cb(true);
                                    } else {
                                        tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.FAILED;
                                        LOGGER.warning(MULTILANG.translateText(mainConfig.language, "{{console.coreInstallFailed}}"));
                                        cb(false);
                                    }
                                } else {
                                    tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.FAILED;
                                    LOGGER.warning(MULTILANG.translateText(mainConfig.language, "{{console.coreInstallFailed}}") + " (exit code: " + code + ")");
                                    cb(false);
                                }
                            });
                            
                            installProcess.on('error', (err) => {
                                tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.FAILED;
                                LOGGER.warning("Installer error: " + err.message);
                                cb(false);
                            });
                        } else {
                            // Обычное ядро (не installer)
                            tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.COMPLETED;
                            // Добавляем новый сервер в конфиг
                            serversConfig[serverName] = {
                                status: PREDEFINED.SERVER_STATUSES.STOPPED,
                                restartOnError: true,
                                maxRestartAttempts: 3,
                                game: "minecraft",
                                minecraftType: "java",
                                stopCommand: "stop"
                            };
                            CONFIGURATION.writeServersConfig(serversConfig);
                            this.writeJavaStartFiles(serverName, coreFileName, startParameters, javaExecutablePath, serverPort, core);
                            LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.serverCreatedSuccess}}", colors.cyan(serverName)));
                            cb(true);
                        }
                    } else {
                        tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.FAILED;
                        LOGGER.warning(MULTILANG.translateText(mainConfig.language, "{{console.coreDownloadFailed}}"));
                        cb(false);
                    }
                }, coreMirrors);
            });
        }
    }
}

// Функция для поиска основного JAR файла сервера после установки
function findServerJar(directory, core) {
    try {
        const files = fs.readdirSync(directory);
        LOGGER.log("[Installer] Files in server directory: " + files.join(", "));
        
        // Приоритет 1: Ищем server.jar (универсальное имя)
        if (files.includes('server.jar')) {
            LOGGER.log("[Installer] Found server.jar");
            return 'server.jar';
        }
        
        // Приоритет 2: Для Forge ищем universal.jar
        if (core.toLowerCase() === 'forge') {
            for (let file of files) {
                if (file.endsWith('-universal.jar')) {
                    LOGGER.log("[Installer] Found forge universal jar: " + file);
                    return file;
                }
            }
        }
        
        // Приоритет 3: Ищем JAR файлы, исключая installer и client
        for (let file of files) {
            if (file.endsWith('.jar') && 
                !file.includes('-installer') && 
                !file.includes('-client') &&
                !file.includes('-dev')) {
                LOGGER.log("[Installer] Found server jar: " + file);
                return file;
            }
        }
        
        LOGGER.warning("[Installer] No valid server jar found!");
        // Если не нашли, возвращаем первый попавшийся JAR (кроме installer)
        for (let file of files) {
            if (file.endsWith('.jar') && !file.includes('-installer')) {
                return file;
            }
        }
    } catch (e) {
        LOGGER.error("Error finding server jar: " + e.message);
    }
    return null;
}

// Записать файлы запуска и eula для сервера Java
exports.writeJavaStartFiles = (serverName, coreFileName, startParameters, javaExecutablePath, serverPort, core = "") => {
    let fullStartParameters = "-Dfile.encoding=UTF-8 " + startParameters + " -jar " + coreFileName + " nogui";
    let fullJavaExecutablePath = path.resolve(javaExecutablePath);
    let serverDir = "./servers/" + serverName;
    
    fs.writeFileSync(serverDir + "/eula.txt", "eula=true");
    
    // Проверяем, есть ли run.bat/run.sh от установщика (Forge/NeoForge)
    let hasRunBat = fs.existsSync(serverDir + "/run.bat");
    let hasRunSh = fs.existsSync(serverDir + "/run.sh");
    
    if (process.platform === "win32") {
        if (hasRunBat) {
            // Если есть родной run.bat от Forge/NeoForge - используем его
            // Но модифицируем для установки правильной Java
            let runBatContent = fs.readFileSync(serverDir + "/run.bat", "utf8");
            // Заменяем java.exe на наш Java
            let modifiedRunBat = runBatContent.replace(
                /"?[^"\s]*\\bin\\java\.exe"?/i,
                '"' + fullJavaExecutablePath + '"'
            );
            // Если не нашли java.exe, добавляем в начало
            if (modifiedRunBat === runBatContent) {
                modifiedRunBat = '@echo off\nchcp 65001>nul\nset JAVA_EXE="' + fullJavaExecutablePath + '"\n' + runBatContent;
            }
            fs.writeFileSync(serverDir + "/start.bat", modifiedRunBat);
        } else {
            // Стандартный start.bat
            fs.writeFileSync(serverDir + "/start.bat", "@echo off\nchcp 65001>nul\ncd servers\ncd " + serverName + "\n" + '"' + fullJavaExecutablePath + '"' + " " + fullStartParameters);
        }
    } else if (process.platform === "linux") {
        if (hasRunSh) {
            // Если есть родной run.sh от Forge/NeoForge - используем его
            let runShContent = fs.readFileSync(serverDir + "/run.sh", "utf8");
            // Заменяем java на наш Java
            let modifiedRunSh = runShContent.replace(
                /(?:^|\s)(?:\/usr\/bin\/)?java(?:\s|$)/i,
                '"' + fullJavaExecutablePath + '" '
            );
            // Если не нашли java, добавляем в начало
            if (modifiedRunSh === runShContent) {
                modifiedRunSh = 'export JAVA_EXE="' + fullJavaExecutablePath + '"\n' + runShContent;
            }
            fs.writeFileSync(serverDir + "/start.sh", modifiedRunSh);
        } else {
            // Стандартный start.sh
            fs.writeFileSync(serverDir + "/start.sh", "cd servers\ncd " + serverName + "\n" + '"' + fullJavaExecutablePath + '"' + " " + fullStartParameters);
        }
    }
    
    fs.writeFileSync(
        serverDir + "/server.properties",
        "server-port=" +
        serverPort +
        "\nquery.port=" +
        serverPort +
        "\nenable-query=true\nonline-mode=false" +
        "\nmotd=\u00A7f" +
        serverName
    );
    return true;
};

// Записать файл запуска для сервера Bedrock
exports.writeBedrockStartFiles = (serverName) => {
    fs.writeFileSync("./servers/" + serverName + "/eula.txt", "eula=true");
    if (process.platform === "win32") {
        fs.writeFileSync("./servers/" + serverName + "/start.bat", "pushd %~dp0\nbedrock_server.exe\npopd");
    } else if (process.platform === "linux") {
        fs.writeFileSync("./servers/" + serverName + "/start.sh", "LD_LIBRARY_PATH=. ./bedrock_server");
    }
    return true;
};

module.exports.startJavaServerGeneration = startJavaServerGeneration;
module.exports.prepareJavaForServer = prepareJavaForServer;