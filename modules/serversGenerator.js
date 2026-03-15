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
    let callbackCalled = false;
    
    // Обёртка для callback, чтобы избежать двойного вызова
    const safeCb = (...args) => {
        if (!callbackCalled) {
            callbackCalled = true;
            cb(...args);
        }
    };
    
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
        safeCb(false);
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
            safeCb(true);
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
                
                // Затем добавляем зеркала из конфига (только если нет зеркал из API)
                const coreKey = core.toLowerCase();
                if (coreMirrors.length === 0 && PREDEFINED.SERVER_CORE_MIRRORS[coreKey]) {
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
                                        safeCb(true);
                                    } else {
                                        tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.FAILED;
                                        LOGGER.warning(MULTILANG.translateText(mainConfig.language, "{{console.coreInstallFailed}}"));
                                        safeCb(false);
                                    }
                                } else {
                                    tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.FAILED;
                                    LOGGER.warning(MULTILANG.translateText(mainConfig.language, "{{console.coreInstallFailed}}") + " (exit code: " + code + ")");
                                    safeCb(false);
                                }
                            });

                            installProcess.on('error', (err) => {
                                tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.FAILED;
                                LOGGER.warning("Installer error: " + err.message);
                                safeCb(false);
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
                            safeCb(true);
                        }
                    } else {
                        tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.FAILED;
                        LOGGER.warning(MULTILANG.translateText(mainConfig.language, "{{console.coreDownloadFailed}}"));
                        safeCb(false);
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
        
        // Проверяем лог установки Forge (новый способ для Forge 1.20.1+)
        let installerLog = files.find(f => f.endsWith('-installer.jar.log'));
        if (installerLog) {
            LOGGER.log("[Installer] Found installer log: " + installerLog);
            try {
                let logContent = fs.readFileSync(directory + path.sep + installerLog, 'utf8');
                LOGGER.log("[Installer] Log content (last 500 chars): " + logContent.slice(-500).replace(/\n/g, ' '));
                
                // Ищем фразу об успешной установке в любом месте лога
                if (logContent.includes('The server installed successfully') || logContent.includes('installed successfully')) {
                    LOGGER.log("[Installer] Forge installer log confirms successful installation");
                } else {
                    LOGGER.warning("[Installer] Installer log does not contain success message, but continuing...");
                }
            } catch (logErr) {
                LOGGER.error("[Installer] Could not read installer log: " + logErr.message);
            }
        } else {
            LOGGER.warning("[Installer] No installer log file found");
        }
        
        // Для Forge 1.20.1+ проверяем наличие run.bat как признак успешной установки
        if (files.includes('run.bat')) {
            LOGGER.log("[Installer] run.bat exists, using as server entry point");
            return 'run.bat';
        }
        if (files.includes('run.sh')) {
            LOGGER.log("[Installer] run.sh exists, using as server entry point");
            return 'run.sh';
        }
        
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
    
    // Если coreFileName это run.bat/run.sh - используем родной файл (без nogui, передадим через args)
    if (coreFileName === 'run.bat' || coreFileName === 'run.sh') {
        // Сначала настраиваем user_jvm_args.txt с нужным объемом памяти
        let memValue = startParameters.match(/-Xmx(\d+)/i);
        if (memValue) {
            let memGB = Math.floor(parseInt(memValue[1]) / 1024);
            if (memGB < 1) memGB = 1;
            let userJvmArgs = `# Xmx and Xms set the maximum and minimum RAM usage, respectively.\n` +
                             `# They can take any number, followed by an M or a G.\n` +
                             `# M means Megabyte, G means Gigabyte.\n` +
                             `# For example, to set the maximum to 3GB: -Xmx3G\n` +
                             `# To set the minimum to 2.5GB: -Xms2500M\n\n` +
                             `# A good default for a modded server is 4GB.\n` +
                             `# Uncomment the next line to set it.\n` +
                             `-Xmx${memGB}G\n`;
            fs.writeFileSync(serverDir + "/user_jvm_args.txt", userJvmArgs);
            LOGGER.log("[Installer] Updated user_jvm_args.txt with -Xmx" + memGB + "G");
        }
        
        if (process.platform === "win32" && hasRunBat) {
            // Ищем win_args.txt в папке libraries
            let winArgsPath = null;
            try {
                let forgeDir = serverDir + '/libraries/net/minecraftforge/forge/';
                let versions = fs.readdirSync(forgeDir);
                for (let ver of versions) {
                    if (fs.existsSync(forgeDir + ver + '/win_args.txt')) {
                        winArgsPath = 'libraries/net/minecraftforge/forge/' + ver + '/win_args.txt';
                        break;
                    }
                }
            } catch (e) {
                LOGGER.warning("[Installer] Could not find win_args.txt, using default");
            }
            
            // Создаём start.bat который запускает Java напрямую с nogui
            let startBat = '@echo off\n' +
                          'chcp 65001>nul\n' +
                          'cd /d %~dp0\n';
            
            if (winArgsPath) {
                startBat += '"' + fullJavaExecutablePath + '" @user_jvm_args.txt @"' + winArgsPath + '" nogui\n';
            } else {
                startBat += '"' + fullJavaExecutablePath + '" @user_jvm_args.txt -jar forge.jar nogui\n';
            }
            
            fs.writeFileSync(serverDir + "/start.bat", startBat);
            LOGGER.log("[Installer] Created start.bat with nogui argument");
        } else if (process.platform === "linux" && hasRunSh) {
            // Ищем unix_args.txt в папке libraries
            let unixArgsPath = null;
            try {
                let forgeDir = serverDir + '/libraries/net/minecraftforge/forge/';
                let versions = fs.readdirSync(forgeDir);
                for (let ver of versions) {
                    if (fs.existsSync(forgeDir + ver + '/unix_args.txt')) {
                        unixArgsPath = 'libraries/net/minecraftforge/forge/' + ver + '/unix_args.txt';
                        break;
                    }
                }
            } catch (e) {
                LOGGER.warning("[Installer] Could not find unix_args.txt, using default");
            }
            
            // Создаём start.sh который запускает Java напрямую с nogui
            let startSh = '#!/bin/bash\n' +
                         'cd "$(dirname "$0")"\n';
            
            if (unixArgsPath) {
                startSh += '"' + fullJavaExecutablePath + '" @user_jvm_args.txt @"' + unixArgsPath + '" nogui\n';
            } else {
                startSh += '"' + fullJavaExecutablePath + '" @user_jvm_args.txt -jar forge.jar nogui\n';
            }
            
            fs.writeFileSync(serverDir + "/start.sh", startSh);
            LOGGER.log("[Installer] Created start.sh with nogui argument");
        }
    } else {
        // Стандартный start.bat/start.sh для обычных JAR
        if (process.platform === "win32") {
            fs.writeFileSync(serverDir + "/start.bat", "@echo off\nchcp 65001>nul\ncd servers\ncd " + serverName + "\n" + '"' + fullJavaExecutablePath + '"' + " " + fullStartParameters);
        } else if (process.platform === "linux") {
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
