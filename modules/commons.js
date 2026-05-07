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
        timeout: 30000,
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
        console.log(`Попытка подключения к: ${currentUrl} (попытка ${i + 1}/${urlsToTry.length})`);

        try {
            const response = await axiosInstance.get(currentUrl);
            return cb(response.data);
        } catch (error) {
            console.error(`Ошибка при подключении к ${currentUrl}: ${error.message}`);
        }
    }

    // Все URL перепробованы
    return cb(false);
};

// Функция для перемещения загруженного на сервер файла
exports.moveUploadedFile = (server, sourceFile, filePath, cb) => {
    if (!this.isObjectsValid(server, sourceFile?.name)) {
        return cb(400);
    }

    const uploadPath = path.join("./servers", server, filePath);
    
    try {
        fs.mkdirSync(path.dirname(uploadPath), {recursive: true});
        sourceFile.mv(uploadPath, (err) => {
            if (err) return cb(err);
            cb(true);
        });
    } catch (err) {
        cb(err);
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
