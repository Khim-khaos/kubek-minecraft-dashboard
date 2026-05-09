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
    setFtpDaemon: (daemon) => { ftpDaemon = daemon; }
};
