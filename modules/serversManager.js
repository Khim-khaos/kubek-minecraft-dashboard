const PREDEFINED = require("./predefined");
const CONFIGURATION = require("./configuration");
const COMMONS = require("./commons");
const TASK_MANAGER = require("./taskManager");
const APP_CONFIG = require("./appConfig");

const fs = require("fs");
const path = require("path");

// Проверить сервер на существование
exports.isServerExists = (serverName) => {
    const serversConfig = APP_CONFIG.getServersConfig();
    return typeof serversConfig[serverName] !== "undefined";
};

// Получить информацию о сервере
exports.getServerInfo = (serverName) => {
    if (this.isServerExists(serverName)) {
        const serversConfig = APP_CONFIG.getServersConfig();
        return serversConfig[serverName];
    }
    return false;
};

// Задать информацию о сервере
exports.writeServerInfo = (serverName, data) => {
    if (this.isServerExists(serverName)) {
        const serversConfig = APP_CONFIG.getServersConfig();
        serversConfig[serverName] = data;
        CONFIGURATION.writeServersConfig(serversConfig);
        return true;
    }
    return false;
};

// Получить статус сервера
exports.getServerStatus = (serverName) => {
    let serverData = this.getServerInfo(serverName);
    if (serverData !== false) {
        return serverData.status;
    }
    return false;
};

// Установить статус сервера
exports.setServerStatus = (serverName, status) => {
    const serversConfig = APP_CONFIG.getServersConfig();
    if (this.isServerExists(serverName) && Object.values(PREDEFINED.SERVER_STATUSES).includes(status) && serversConfig[serverName].status !== status) {
        serversConfig[serverName].status = status;
        CONFIGURATION.writeServersConfig(serversConfig);
        return true;
    }
    return false;
};

// Установить параметр в конфигурации сервера
exports.setServerProperty = (serverName, property, value) => {
    const serversConfig = APP_CONFIG.getServersConfig();
    if (this.isServerExists(serverName) && COMMONS.isObjectsValid(property, value, serversConfig[serverName][property])) {
        serversConfig[serverName][property] = value;
        CONFIGURATION.writeServersConfig(serversConfig);
        return true;
    }
    return false;
};

// Получить список серверов
// DEVELOPED by seeeroy
exports.getServersList = () => {
    const serversConfig = APP_CONFIG.getServersConfig();
    return Object.keys(serversConfig);
};

// Безвозвратно удалить сервер
exports.deleteServer = (serverName) => {
    const serversConfig = APP_CONFIG.getServersConfig();
    if(this.isServerExists(serverName) && this.getServerStatus(serverName) === PREDEFINED.SERVER_STATUSES.STOPPED){
        // Добавляем новую таску
        let serverDelTaskID = TASK_MANAGER.addNewTask({
            type: PREDEFINED.TASKS_TYPES.DELETION,
            server: serverName,
            status: PREDEFINED.SERVER_STATUSES.RUNNING
        })

        // Запускаем удаление папки
        fs.rm("./servers/" + serverName, { recursive: true, force: true }, (err) => {
            if(err){
                throw err;
            }
            // Удаляем сервер из конфигурации и меняем статус таски
            const serversConfig = APP_CONFIG.getServersConfig();
            serversConfig[serverName] = null;
            delete serversConfig[serverName];
            CONFIGURATION.writeServersConfig(serversConfig);
            let tData = TASK_MANAGER.getTaskData(serverDelTaskID);
            tData.status = PREDEFINED.SERVER_CREATION_STEPS.COMPLETED;
        });
        return true;
    }
    return false;
};