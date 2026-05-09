// Формат перевода в тексте: {{категория.ключ}}

const fs = require('fs');
const path = require('path');
const APP_CONFIG = require("./appConfig");

// Список кодов для доступных языков
global.avaliableLanguages = {};
// Кеш переводов
const translationsCache = {};

// Загрузить список доступных языков
exports.loadAvailableLanguages = () => {
    if (fs.existsSync(path.join(__dirname, "./../languages"))) {
        fs.readdirSync(path.join(__dirname, "./../languages")).forEach(file => {
            if (path.extname(file) === ".json") {
                const langPath = path.join(__dirname, "./../languages", file);
                const langFile = JSON.parse(fs.readFileSync(langPath).toString());
                if (langFile.info?.code && langFile.info?.id && langFile.info?.displayNameEnglish) {
                    avaliableLanguages[langFile.info.code] = langFile.info;
                    // Кешируем переводы сразу
                    translationsCache[langFile.info.code] = langFile;
                }
            }
        })
        APP_CONFIG.setAvailableLanguages(avaliableLanguages);
        return true;
    }
    return false;
};

// Получить информацию о языке по названию
exports.getLanguageInfo = (language) => {
    return avaliableLanguages[language] || false;
};

// Перевести все вхождения меток переводов в текст
exports.translateText = (language, text, ...placers) => {
    text = text.toString();
    const langData = translationsCache[language];
    
    if (langData) {
        // Ищем плейсхолдеры перевода по regex
        const searchMatches = text.match(/\{{[0-9a-zA-Z\-_.]+\}}/gm);
        if (searchMatches != null) {
            searchMatches.forEach(match => {
                // Чистим match-и от скобок и делим на категорию и ключ
                const matchClear = match.replace(/[{}]/g, "");
                const parts = matchClear.split(".");
                
                if (parts.length >= 2) {
                    const category = parts[0];
                    const key = parts[1];
                    const modificator = parts[2];
                    
                    // Заменяем в тексте найденные в списке переводы
                    if (langData.translations?.[category]?.[key] !== undefined) {
                        let matchedTranslation = langData.translations[category][key];
                        if (modificator === "upperCase") {
                            matchedTranslation = matchedTranslation.toUpperCase();
                        } else if (modificator === "lowerCase") {
                            matchedTranslation = matchedTranslation.toLowerCase();
                        }
                        text = text.replaceAll(match, matchedTranslation);
                    }
                }
            });
        }
        
        // Заменяем плейсхолдеры текста (%0%, %1%...) на предоставленные объекты
        placers.forEach((replacement, i) => {
            text = text.replaceAll("%" + i + "%", replacement);
        });
        
        return text;
    }
    return text; // Возвращаем оригинальный текст, если язык не найден
};

// Получить EULA для опр. языка
exports.getEULA = (language) => {
    return translationsCache[language]?.eula || false;
};