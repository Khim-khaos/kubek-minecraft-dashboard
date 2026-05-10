/**
 * Модуль для хранения состояния конфигурации приложения.
 * Позволяет избежать использования глобальных переменных.
 */

let mainConfig = {};
let usersConfig = {};
let serversConfig = {};
let currentLanguage = "en";
let availableLanguages = [];
let ftpDaemon = null;
let webServer = null;

// Состояние серверов
let serversInstances = {};
let instancesLogs = {};
let restartAttempts = {};
let serversToManualRestart = [];
let tasks = {};

module.exports = {
    getMainConfig: () => mainConfig,
    setMainConfig: (config) => { mainConfig = config; },
    
    getUsersConfig: () => usersConfig,
    setUsersConfig: (config) => { usersConfig = config; },
    
    getServersConfig: () => serversConfig,
    setServersConfig: (config) => { serversConfig = config; },
    
    getCurrentLanguage: () => currentLanguage,
    setCurrentLanguage: (lang) => { currentLanguage = lang; },

    getAvailableLanguages: () => availableLanguages,
    setAvailableLanguages: (langs) => { availableLanguages = langs; },

    getFtpDaemon: () => ftpDaemon,
    setFtpDaemon: (daemon) => { ftpDaemon = daemon; },

    getWebServer: () => webServer,
    setWebServer: (server) => { webServer = server; },

    // Геттеры и сеттеры для состояния серверов
    getServersInstances: () => serversInstances,
    getInstancesLogs: () => instancesLogs,
    getRestartAttempts: () => restartAttempts,
    getServersToManualRestart: () => serversToManualRestart,
    getTasks: () => tasks,
    
    setInstancesLogs: (logs) => { instancesLogs = logs; }
};
