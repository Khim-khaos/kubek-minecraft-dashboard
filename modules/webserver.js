const LOGGER = require("./logger");
const PREDEFINED = require("./predefined");
const COMMONS = require("./commons");
const SECURITY = require("./security");
const FILE_MANAGER = require("./fileManager");
const MULTILANG = require("./multiLanguage");
const APP_CONFIG = require("./appConfig");

const fs = require("fs");
const express = require('express');
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const helmet = require("helmet");
const compression = require("compression");
const colors = require('colors');
const mime = require("mime");
const path = require('path');
const os = require('os');
const {isInSubnet} = require('is-in-subnet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger-output.json');

const webServer = express();
APP_CONFIG.setWebServer(webServer);
const webPagesPermissions = {};

// Применяем базовую защиту и сжатие
webServer.use(helmet({
    contentSecurityPolicy: false, // Отключаем CSP для совместимости со старым фронтендом
    crossOriginEmbedderPolicy: false
}));

// Общий лимитер для всех запросов
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 10000, // Увеличиваем лимит до 10000 запросов на IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many requests",
        message: "Please try again later"
    },
    skip: (req) => {
        // Пропускаем локальные запросы, статику и частые эндпоинты мониторинга
        const ip = getRequestIP(req);
        const isLocal = ip === '127.0.0.1' || ip === 'localhost' || ip === '::1';
        const isStatic = !req.path.startsWith('/api/');
        const isMonitoring = req.path.includes('/health') || req.path.includes('/usage') || req.path.includes('/tasks');
        
        return isLocal || isStatic || isMonitoring;
    }
});
webServer.use(generalLimiter);

// Middleware для Request ID
webServer.use((req, res, next) => {
    req.id = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
});

webServer.use(compression());

// Настройка Swagger
webServer.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

webServer.use(cookieParser());
webServer.use(express.json({limit: '50mb'}));
webServer.use(express.urlencoded({limit: '50mb', extended: true}));
webServer.use(
    fileUpload({
        useTempFiles: true,
        tempFileDir: os.tmpdir(),
    })
);

// Получаем порт веб-сервера из конфига
let webPort = APP_CONFIG.getMainConfig().webserverPort;

/**
 * Получить IP-адрес из запроса (с учетом прокси)
 * @param {express.Request} req 
 * @returns {string}
 */
const getRequestIP = (req) => {
    const mainConfig = APP_CONFIG.getMainConfig();
    let ip;
    if (mainConfig.proxy && mainConfig.proxy.enabled) {
        ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    } else {
        ip = req.socket.remoteAddress;
    }
    return ip.replace("::ffff:", "").replace("::1", "127.0.0.1").split(',')[0].trim();
};

/**
 * Логирование веб-запроса
 * @param {express.Request} req 
 * @param {express.Response} res 
 * @param {string|null} username 
 */
exports.logWebRequest = (req, res, username = null) => {
    const ip = getRequestIP(req);
    let additionalInfo2 = "";
    if (username !== null) {
        additionalInfo2 = "[" + colors.cyan(username) + "]"
    }
    LOGGER.log("[" + colors.yellow(ip) + "]", additionalInfo2, colors.green(req.method) + " - " + req.originalUrl);
};

/**
 * Middleware для аутентификации и логирования
 */
exports.authLoggingMiddleware = (req, res, next) => {
    const ip = getRequestIP(req);
    const startTime = Date.now();

    // Проверяем существование куков у пользователя на предмет логина
    let username = null;
    const mainConfig = APP_CONFIG.getMainConfig();
    if (SECURITY.isUserHasCookies(req) && mainConfig.authorization === true) {
        username = req.cookies["kbk__login"];
    }

    // Показываем запрос в логах
    if (!COMMONS.testForRegexArray(req.path, PREDEFINED.NO_LOG_URLS)) {
        res.on("finish", () => {
            const duration = Date.now() - startTime;
            const status = res.statusCode;
            const statusColor =
                status >= 500 ? colors.red : status >= 400 ? colors.yellow : status >= 300 ? colors.cyan : colors.green;

            this.logWebRequest(req, res, username);
            LOGGER.debug(`[REQUEST] ${req.id} ${req.method} ${req.originalUrl} - ${statusColor(status)} (${duration}ms)`);
        });
    }

    // Добавляем проверку на вхождение IP в range (при включенной функции)
    if (mainConfig.allowOnlyIPsList === true && !isInSubnet(ip, mainConfig.IPsAllowed)) {
        return res.sendStatus(403);
    }

    // Проверяем включена ли авторизация и есть ли у пользователя доступ к серверу
    if (mainConfig.authorization === true && !COMMONS.testForRegexArray(req.originalUrl, PREDEFINED.SKIP_AUTH_URLS)) {
        if (SECURITY.isUserHasCookies(req) && SECURITY.authenticateUser(req.cookies["kbk__login"], req.cookies["kbk__hash"])) {
            return next();
        } else {
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(401).json({error: "Unauthorized"});
            }
            return res.redirect("/login.html");
        }
    } else {
        return next();
    }
};

// Middleware для обработки ошибок
exports.errorHandlerMiddleware = (err, req, res, next) => {
    LOGGER.error(`[EXPRESS ERROR] ${req.method} ${req.originalUrl} - ${err.message}`);
    if (err.stack) LOGGER.writeLineToLog(err.stack);
    
    const statusCode = err.status || 500;
    res.status(statusCode).send({
        success: false,
        error: statusCode === 500 ? "Internal Server Error" : "Request Error",
        message: process.env.DEBUG === 'true' || statusCode !== 500 ? err.message : "Something went wrong"
    });
};

/**
 * Маршрут для проверки работоспособности (Health Check)
 */
exports.healthCheckHandler = (req, res) => {
    const data = {
        status: 'up',
        uptime: process.uptime(),
        timestamp: Date.now(),
        version: require('../package.json').version,
        node: process.version,
        platform: process.platform,
        memory: process.memoryUsage()
    };
    res.status(200).json(data);
};

// Middleware для статических страниц
let errorPageCache = null;
let translatedFilesCache = {};

/**
 * Очистить кэш переведённых файлов
 */
exports.clearTranslatedFilesCache = () => {
    translatedFilesCache = {};
    errorPageCache = null;
};
global.clearTranslatedFilesCache = exports.clearTranslatedFilesCache;

/**
 * Middleware для отдачи статических файлов с переводом и кэшированием
 */
exports.staticsMiddleware = async (req, res, next) => {
    let relPath = req.path === "/" ? "/index.html" : req.path;
    let filePath = path.join(__dirname, "./../web", relPath);
    let ext = path.extname(relPath).replace(".", "").toLowerCase();

    // Базовая проверка на path traversal
    const webDir = path.resolve(__dirname, "./../web");
    const resolvedPath = path.resolve(filePath);

    if (!resolvedPath.startsWith(webDir)) {
        return next();
    }

    try {
        const stats = await fs.promises.stat(resolvedPath);
        if (PREDEFINED.ALLOWED_STATIC_EXTS.includes(ext) && stats.isFile()) {
            // Устанавливаем заголовки кэширования для статики
            // Для ассетов (картинки, шрифты) ставим долгий кэш
            if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'woff', 'woff2', 'ttf', 'otf'].includes(ext)) {
                res.set('Cache-Control', 'public, max-age=604800'); // 7 дней
            } else {
                res.set('Cache-Control', 'public, max-age=3600'); // 1 час для остального
            }

            // Детектим и отправляем content-type
            res.set("content-type", mime.getType(resolvedPath));

            // Переводим файл, если нужно
            if (PREDEFINED.TRANSLATION_STATIC_EXTS.includes(ext)) {
                const currentLanguage = APP_CONFIG.getCurrentLanguage();
                const cacheKey = `${currentLanguage}:${resolvedPath}`;
                
                if (translatedFilesCache[cacheKey]) {
                    return res.send(translatedFilesCache[cacheKey]);
                }

                let fileData = await fs.promises.readFile(resolvedPath);
                fileData = MULTILANG.translateText(currentLanguage, fileData);
                
                // Сохраняем в кэш
                translatedFilesCache[cacheKey] = fileData;
                
                return res.send(fileData);
            } else {
                // Для файлов без перевода используем sendFile для лучшей производительности
                return res.sendFile(resolvedPath);
            }
        }
    } catch (e) {
        // Если файл не найден или другая ошибка - просто идем дальше
    }
    return next();
};

// Middleware для проверки на доступ к серверу (ставится ко всем роутерам!)
exports.serversRouterMiddleware = (req, res, next) => {
    // Если авторизация отключена
    if (APP_CONFIG.getMainConfig().authorization === false) {
        return next();
    }

    let chkValue = false;
    if (COMMONS.isObjectsValid(req.params.server)) {
        chkValue = req.params.server;
    } else if (COMMONS.isObjectsValid(req.query.server)) {
        chkValue = req.query.server;
    }

    // Если проверка не требуется
    if (chkValue === false) {
        return next();
    }

    if (SECURITY.isUserHasCookies(req) && SECURITY.isUserHasServerAccess(req.cookies["kbk__login"], chkValue)) {
        return next();
    }
    return res.sendStatus(403);
}

/**
 * Middleware для защиты от CSRF через проверку заголовка
 */
exports.csrfMiddleware = (req, res, next) => {
    // Пропускаем GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Проверяем наличие заголовка
    if (req.headers['x-kubek-csrf'] === 'true') {
        return next();
    }

    // Если заголовка нет, но есть авторизация - это подозрительно
    if (SECURITY.isUserHasCookies(req)) {
        LOGGER.warn(`[SECURITY] Potential CSRF blocked from IP: ${getRequestIP(req)} on ${req.method} ${req.originalUrl}`);
        return res.status(403).send({
            success: false,
            error: "CSRF check failed"
        });
    }

    return next();
};

/**
 * Валидация обязательных полей в теле запроса
 * @param {string[]} fields 
 */
exports.validateBody = (fields) => {
    return (req, res, next) => {
        const missing = fields.filter(f => !req.body || req.body[f] === undefined);
        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                error: "Validation Error",
                message: `Missing required fields: ${missing.join(', ')}`
            });
        }
        next();
    };
};

// Функция для загрузки всех роутеров из списка в predefined
exports.loadAllDefinedRouters = () => {
    require("./permissionsMiddleware");
    webServer.use(this.authLoggingMiddleware);
    webServer.use(this.csrfMiddleware);
    webServer.use(this.staticsMiddleware);

    // Подключаем системные роутеры
    let healthRouter = require("./../routers/health.js");
    webServer.use("/api/health", healthRouter.router);

    let coresRouter = require("./../routers/cores.js");
    webServer.use("/api/cores", coresRouter.router);

    let tasksRouter = require("./../routers/tasks.js");
    webServer.use("/api/tasks", tasksRouter.router);

    let fileManagerRouter = require("./../routers/fileManager.js");
    webServer.use("/api/fileManager", fileManagerRouter.router);

    let serversRouter = require("./../routers/servers.js");
    webServer.use("/api/servers", serversRouter.router);

    let modsRouter = require("./../routers/mods.js");
    webServer.use("/api/mods", modsRouter.router);

    let pluginsRouter = require("./../routers/plugins.js");
    webServer.use("/api/plugins", pluginsRouter.router);

    let javaRouter = require("./../routers/java.js");
    webServer.use("/api/java", javaRouter.router);

    let authRouter = require("./../routers/auth.js");
    webServer.use("/api/auth", authRouter.router);

    let accountsRouter = require("./../routers/accounts.js");
    webServer.use("/api/accounts", accountsRouter.router);

    let kubekRouter = require("./../routers/kubek.js");
    webServer.use("/api/kubek", kubekRouter.router);

    let updatesRouter = require("./../routers/updates.js");
    webServer.use("/api/updates", updatesRouter.router);

    // Хэндлер для ошибки 404
    webServer.use(async (req, res) => {
        if (!res.headersSent) {
            if (!errorPageCache) {
                try {
                    const data = await fs.promises.readFile(path.join(__dirname, "./../web/404.html"));
                    errorPageCache = data.toString();
                } catch (e) {
                    errorPageCache = "404 Not Found";
                }
            }
            return res.status(404).send(errorPageCache);
        }
    });

    // Хэндлер для ошибки 500
    webServer.use((err, req, res, next) => {
        LOGGER.error(`[Webserver] Internal Server Error: ${err.message}`);
        if (err.stack) {
            LOGGER.writeLineToLog(err.stack);
        }
        if (!res.headersSent) {
            res.status(500).send({
                error: "Internal Server Error",
                message: err.message
            });
        }
    });
};

// Запустить веб-сервер на выбранном порту
exports.startWebServer = () => {
    const server = webServer.listen(webPort, () => {
        LOGGER.log(
            MULTILANG.translateText(
                APP_CONFIG.getMainConfig().language,
                "{{console.webserverStarted}}",
                colors.cyan(webPort)
            )
        );
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            LOGGER.log(colors.red(`Ошибка: Порт ${webPort} уже занят. Пожалуйста, измените webserverPort в config.json.`));
        } else {
            LOGGER.log(colors.red(`Ошибка при запуске веб-сервера: ${err.message}`));
        }
        process.exit(1);
    });
};
