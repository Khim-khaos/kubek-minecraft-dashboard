const PREDEFINED = require("./predefined");

// Определяем язык интерфейса для пользователя
const fs = require("fs");
const axios = require("axios");
const path = require("path");

exports.detectUserLocale = () => {
    let userLocale = Intl.DateTimeFormat()
        .resolvedOptions()
        .locale.toString()
        .split("-")[0];
    if (userLocale !== "ru" && userLocale !== "nl") {
        userLocale = "en";
    }
    return userLocale.toLowerCase();
};

// Создать необходимые базовые папки
exports.makeBaseDirs = () => {
    PREDEFINED.BASE_DIRS.forEach(function (dir) {
        if (!fs.existsSync("./" + dir)) {
            fs.mkdirSync("./" + dir);
        }
    });
};

// Проверить все объекты на !== undefined
exports.isObjectsValid = (...objects) => {
    let validCount = 0;
    let summCount = objects.length;
    objects.forEach(function (obj) {
        if (typeof obj !== "undefined" && obj !== null) {
            validCount++;
        }
    });
    return summCount === validCount;
};

// Получить axios instance с настройками прокси
function getAxiosInstance() {
    const config = {
        baseURL: '',
        timeout: 60000, // Увеличиваем до 60 секунд для медленных API
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
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

// Получить данные по ссылке (с поддержкой зеркал)
exports.getDataByURL = async (url, cb, mirrors = []) => {
    const axiosInstance = getAxiosInstance();
    
    // Список URL для попытки (основной + зеркала)
    const urlsToTry = [url, ...mirrors];

    for (let i = 0; i < urlsToTry.length; i++) {
        const currentUrl = urlsToTry[i];

        try {
            const response = await axiosInstance.get(currentUrl);
            if (typeof cb === 'function') {
                return cb(response.data);
            }
            return response.data;
        } catch (error) {
            console.error(`Ошибка при подключении к ${currentUrl}: ${error.message}`);
        }
    }

    // Все URL перепробованы
    if (typeof cb === 'function') {
        return cb(false);
    }
    return false;
};

// Функция для перемещения загруженного на сервер файла
exports.moveUploadedFile = async (server, sourceFile, filePath) => {
    if (!this.isObjectsValid(server, sourceFile?.name)) {
        return 400;
    }

    const uploadPath = path.join("./servers", server, filePath);
    
    try {
        await fs.promises.mkdir(path.dirname(uploadPath), {recursive: true});
        return new Promise((resolve) => {
            sourceFile.mv(uploadPath, (err) => {
                if (err) resolve(err);
                resolve(true);
            });
        });
    } catch (err) {
        return err;
    }
}

// Проверить текст на совпадения с массивом regexp`ов
exports.testForRegexArray = (text, regexArray) => {
    let testResult = false;
    regexArray.forEach((regexpItem) => {
        if (typeof regexpItem == "object" && text.match(regexpItem) !== null) {
            testResult = true;
        } else if (typeof regexpItem == "string" && regexpItem === text) {
            testResult = true;
        }
    });
    return testResult;
};

// DEVELOPED by seeeroy
