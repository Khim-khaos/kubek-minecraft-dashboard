const SHA256 = require("crypto-js/sha256");
const crypto = require("crypto");

/**
 * Проверить имеет ли пользователь определённое право
 * @param {string} username 
 * @param {string} permission 
 * @returns {boolean}
 */
exports.isUserHasPermission = (username, permission) => {
    if (mainConfig.authorization === false) {
        // Сразу разрешаем доступ, если авторизация отключена в конфигурации
        return true;
    }
    let userData = this.getUserDataByUsername(username);
    return userData !== false && userData.permissions.includes(permission);
};

/**
 * Проверить, имеет ли пользователь доступ к серверу
 * @param {string} username 
 * @param {string} server 
 * @returns {boolean}
 */
exports.isUserHasServerAccess = (username, server) => {
    if (mainConfig.authorization === false) {
        // Сразу разрешаем доступ, если авторизация отключена в конфигурации
        return true;
    }
    let userData = this.getUserDataByUsername(username);
    if (userData !== false) {
        if (userData.serversAccessRestricted === false || userData.serversAllowed.includes(server)) {
            return true;
        }
    }
    return false;
};

/**
 * Авторизовать пользователя по логину и паролю
 * @param {string} login 
 * @param {string} password 
 * @returns {boolean}
 */
exports.authorizeUser = (login, password) => {
    if (mainConfig.authorization === false) {
        // Сразу разрешаем доступ, если авторизация отключена в конфигурации
        return true;
    }
    let userData = this.getUserDataByUsername(login);
    return userData !== false && userData.password === SHA256(password).toString();
};

/**
 * Провести аутентификацию пользователя по логину и секрету (хэшу)
 * @param {string} login 
 * @param {string} secret 
 * @returns {boolean}
 */
exports.authenticateUser = (login, secret) => {
    if (mainConfig.authorization === false) {
        // Сразу разрешаем доступ, если авторизация отключена в конфигурации
        return true;
    }
    let userData = this.getUserDataByUsername(login);
    return userData !== false && userData.secret === secret;
};

/**
 * Получить данные пользователя из конфига по имени
 * @param {string} username 
 * @returns {object|false}
 */
exports.getUserDataByUsername = (username) => {
    return usersConfig[username] || false;
};

/**
 * Проверить существование куков у пользователя
 * @param {express.Request} req 
 * @returns {boolean}
 */
exports.isUserHasCookies = (req) => {
    return typeof req.cookies["kbk__hash"] !== "undefined" && typeof req.cookies["kbk__login"] !== "undefined";
};

/**
 * Проверить существование пользователя
 * @param {string} username 
 * @returns {boolean}
 */
exports.isUserExists = (username) => {
    return this.getUserDataByUsername(username) !== false;
};

/**
 * Сгенерировать рандомный ID безопасности
 * @param {number} length 
 * @returns {string}
 */
exports.generateSecureID = (length = 18) => {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex') // Превращаем в hex строку
        .slice(0, length); // Обрезаем до нужной длины
}