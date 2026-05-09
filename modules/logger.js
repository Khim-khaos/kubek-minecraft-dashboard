const fs = require("fs");
const path = require("path");
const colors = require("colors");

const PREDEFINED = require("./predefined");
const packageJSON = require("./../package.json");

// Получить отформатированное время для логов
exports.getTimeFormatted = () => {
    let dateTime = new Date();
    return (
        "[" +
        dateTime.getHours().toString().padStart(2, "0") +
        ":" +
        dateTime.getMinutes().toString().padStart(2, "0") +
        ":" +
        dateTime.getSeconds().toString().padStart(2, "0") +
        "." +
        dateTime.getMilliseconds().toString().padStart(2, "0") +
        "]"
    );
};

// Получить имя файла для лога
exports.getLastLogFileName = () => {
    let dateTime = new Date();
    return dateTime.getDate().toString().padStart(2, "0") +
        "-" +
        (dateTime.getMonth() + 1).toString().padStart(2, "0") +
        "-" +
        dateTime.getFullYear().toString().padStart(2, "0") +
        ".log";
};

// Записать строку в лог
exports.writeLineToLog = (line) => {
    let fileName = this.getLastLogFileName();
    fs.appendFile("./logs/" + fileName, line + "\n", (err) => {
        if (err) {
            console.error(colors.red("[LOGGER ERROR] Failed to write to log file:"), err);
        }
    });
};

// Вывести текст в консоль и записать в файл
exports.log = (...args) => {
    let text = args.map(arg => {
        if (arg instanceof Error) return arg.stack || arg.message;
        if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
        return String(arg);
    }).join(" ");
    
    let preparedText = this.getTimeFormatted() + " " + text;
    console.log(preparedText);
    this.writeLineToLog(preparedText);
};

// Вывести текст типа WARNING в консоль и записать в файл
exports.warning = (...args) => {
    let text = args.map(arg => {
        if (arg instanceof Error) return arg.stack || arg.message;
        if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
        return String(arg);
    }).join(" ");

    let preparedText = this.getTimeFormatted() + " " + text;
    console.log(colors.yellow(preparedText));
    this.writeLineToLog("[WARN] " + preparedText);
};

// Вывести текст типа ERROR в консоль и записать в файл
exports.error = (...args) => {
    let text = args.map(arg => {
        if (arg instanceof Error) return arg.stack || arg.message;
        if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
        return String(arg);
    }).join(" ");

    let preparedText = this.getTimeFormatted() + " " + text;
    console.log(colors.red(preparedText));
    this.writeLineToLog("[ERR] " + preparedText);
};

// Вывести текст типа SUCCESS в консоль и записать в файл
exports.success = (...args) => {
    let text = args.map(arg => {
        if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
        return String(arg);
    }).join(" ");

    let preparedText = this.getTimeFormatted() + " " + text;
    console.log(colors.green(preparedText));
    this.writeLineToLog("[SUCCESS] " + preparedText);
};

// Вывести текст типа DEBUG в консоль и записать в файл
exports.debug = (...args) => {
    if (process.env.DEBUG !== 'true') return;

    let text = args.map(arg => {
        if (arg instanceof Error) return arg.stack || arg.message;
        if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
        return String(arg);
    }).join(" ");

    let preparedText = this.getTimeFormatted() + " " + text;
    console.log(colors.gray(preparedText));
    this.writeLineToLog("[DEBUG] " + preparedText);
};

// Очистка старых лог-файлов (оставляем логи за последние 7 дней)
exports.cleanupOldLogs = () => {
    const logsDir = "./logs/";
    if (!fs.existsSync(logsDir)) return;

    fs.readdir(logsDir, (err, files) => {
        if (err) {
            this.error("[LOGGER] Error reading logs directory for cleanup:", err);
            return;
        }

        const now = new Date();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 дней в миллисекундах

        files.forEach(file => {
            if (path.extname(file) === ".log") {
                const filePath = path.join(logsDir, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) return;
                    if (now - stats.mtime > maxAge) {
                        fs.unlink(filePath, (err) => {
                            if (err) this.error(`[LOGGER] Failed to delete old log file: ${file}`, err);
                            else this.debug(`[LOGGER] Deleted old log file: ${file}`);
                        });
                    }
                });
            }
        });
    });
};

// Вывести приветственное сообщение Kubek
exports.kubekWelcomeMessage = () => {
    console.log("");
    console.log(colors.cyan(PREDEFINED.KUBEK_LOGO_ASCII));
    console.log("");
    console.log(colors.inverse("Kubek " + packageJSON.version));
    console.log(colors.inverse(packageJSON.repository.url.split("+")[1]));
    console.log("");
}