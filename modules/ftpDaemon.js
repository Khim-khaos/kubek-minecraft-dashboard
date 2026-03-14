const MULTILANG = require("./multiLanguage");
const LOGGER = require("./logger");
const colors = require("colors");
const path = require("path");

let ftpServer = null;
let defaultOptions = {
    host: "127.0.0.1",
    port: 21,
    tls: null
};

// Динамически импортируем ftp-srv-esm (ES Module)
let FtpSrv = null;
let ftpErrors = null;

async function loadFtpSrv() {
    if (!FtpSrv) {
        const ftpSrvModule = await import("ftp-srv-esm");
        FtpSrv = ftpSrvModule.default;
        const errorsModule = await import("ftp-srv-esm/src/errors.js");
        ftpErrors = errorsModule.default;
    }
}

exports.startFTP = async () => {
    await loadFtpSrv();
    
    let isEnabled = mainConfig.ftpd.enabled;
    if (isEnabled) {
        let initPath = path.normalize("./");
        let username = mainConfig.ftpd.username;
        let password = mainConfig.ftpd.password;
        let port = mainConfig.ftpd.port;

        // Создаём FTP сервер
        ftpServer = new FtpSrv({
            url: `ftp://${defaultOptions.host}:${port}`,
            anonymous: false,
            pasv_min: 1025,
            pasv_max: 1050,
            tlsOptions: defaultOptions.tls,
            allowUnauthorizedTls: true
        });

        // Обработка аутентификации
        ftpServer.on('login', ({ connection, username: inputUsername, password: inputPassword }, resolve, reject) => {
            if (inputUsername === username && inputPassword === password) {
                LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.ftpConnected}}") + colors.green(username));
                resolve({
                    root: initPath,
                    cwd: '/',
                    blacklist: [] // Все команды разрешены
                });
            } else {
                reject(new ftpErrors.GeneralError('Invalid username or password', 401));
            }
        });

        // Обработка ошибок сервера
        ftpServer.on('client:error', (err) => {
            LOGGER.error(MULTILANG.translateText(mainConfig.language, "{{console.ftpError}}") + err.toString());
        });

        // Запуск сервера
        ftpServer.listen().then(() => {
            LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.ftpStarted}}") + colors.cyan(port));
        }).catch((err) => {
            LOGGER.error(MULTILANG.translateText(mainConfig.language, "{{console.ftpError}}") + err.toString());
        });

        return true;
    }
};

// Остановить сервер
exports.stopFTP = () => {
    if (ftpServer) {
        ftpServer.close();
        ftpServer = null;
        LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.ftpStopped}}"));
    }
    return true;
};

// Запущен ли FTP-сервер
exports.isFTPStarted = () => {
    return ftpServer !== null;
};
