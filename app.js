// Загружаем переменные окружения
require('dotenv').config();

// Загружаем нужные самописные модули
const COMMONS = require("./modules/commons");
const CONFIGURATION = require("./modules/configuration");
const APP_CONFIG = require("./modules/appConfig");

// Создаём нужные папки (если их не существует)
COMMONS.makeBaseDirs();

// Загружаем файлы конфигурации в глобальные переменные
CONFIGURATION.reloadAllConfigurations();
CONFIGURATION.migrateOldMainConfig();
CONFIGURATION.migrateOldServersConfig();

const LOGGER = require("./modules/logger");
const MULTI_LANGUAGE = require("./modules/multiLanguage");
const WEBSERVER = require("./modules/webserver");
const STATS_COLLECTION = require("./modules/statsCollection");
const FTP_DAEMON = require("./modules/ftpDaemon");

const collStats = STATS_COLLECTION.collectStats();
STATS_COLLECTION.sendStatsToServer(collStats, true);

// Загружаем доступные языки и ставим переменную с языком из конфига
MULTI_LANGUAGE.loadAvailableLanguages();
global.currentLanguage = mainConfig.language;
APP_CONFIG.setCurrentLanguage(mainConfig.language);

// Показываем приветствие
LOGGER.kubekWelcomeMessage();

WEBSERVER.loadAllDefinedRouters();
WEBSERVER.startWebServer();

// Запускаем FTP-сервер (асинхронно)
global.ftpDaemon = null;
FTP_DAEMON.startFTP();

// Автоматически запустить сервера, которые были запущены при закрытии Kubek
CONFIGURATION.autoStartServers();

// Периодическая очистка логов серверов в памяти (каждые 10 минут)
setInterval(() => {
    const SERVERS_CONTROLLER = require("./modules/serversController");
    SERVERS_CONTROLLER.doServersLogsCleanup();
}, 10 * 60 * 1000);

// Периодическая проверка обновлений (каждые 6 часов)
setInterval(() => {
    const UPDATER = require("./modules/updater");
    UPDATER.checkForUpdates(() => {});
}, 6 * 60 * 60 * 1000);

// Периодическая очистка старых системных логов (раз в сутки)
LOGGER.cleanupOldLogs();
setInterval(() => {
    LOGGER.cleanupOldLogs();
}, 24 * 60 * 60 * 1000);

// Обработка непредвиденных ошибок
process.on('uncaughtException', (err) => {
    LOGGER.error(`[CRITICAL] Uncaught Exception: ${err.message}`);
    if (err.stack) LOGGER.writeLineToLog(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    LOGGER.error(`[CRITICAL] Unhandled Rejection at: ${promise}, reason: ${reason}`);
});
