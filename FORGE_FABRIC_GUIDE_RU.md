# Руководство по установке Forge, Fabric и NeoForge

## Обзор

Kubek теперь поддерживает автоматическую загрузку и установку модифицированных ядер серверов:
- **Forge** - популярная платформа для модов
- **Fabric** - легковесная альтернатива Forge
- **NeoForge** - форк Forge для новых версий Minecraft

## Как создать сервер с Forge/Fabric/NeoForge

### Шаг 1: Откройте мастер создания сервера

1. Нажмите кнопку **"Создать сервер"** в левом верхнем углу
2. Введите имя сервера (например, `my-forge-server`)

### Шаг 2: Выберите ядро

В списке доступных ядер выберите одно из:
- **Forge** - для версий Minecraft 1.5.2 и новее
- **Fabric** - для версий Minecraft 1.14 и новее
- **NeoForge** - для версий Minecraft 1.20.1 и новее

### Шаг 3: Выберите версию Minecraft

Выберите нужную версию Minecraft из списка. Для Forge/Fabric будут показаны все поддерживаемые версии.

### Шаг 4: Настройте параметры

- **Версия Java:** Выберите нужную версию (рекомендуется Java 17 для 1.17+, Java 8 для старых версий)
- **Выделенная память:** Укажите количество RAM (минимум 2GB для модифицированных серверов)
- **Порт:** Оставьте 25565 или укажите другой

### Шаг 5: Нажмите "Создать"

Kubek автоматически:
1. Скачает installer ядра
2. Запустит установку (для Forge/NeoForge)
3. Настроит файлы запуска
4. Создаст конфигурацию сервера

## Технические детали

### Forge

**Процесс установки:**
1. Скачивается `forge-{version}-installer.jar`
2. Запускается с флагом `--installServer`
3. Installer создаёт файлы сервера в папке
4. Kubek определяет установленные файлы и создаёт start.bat/start.sh

**Структура папки после установки:**
```
servers/my-forge-server/
├── libraries/              # Библиотеки Forge
├── user_jvm_args.txt       # JVM аргументы (настраивается Kubek)
├── run.bat                 # Скрипт запуска (Windows)
├── run.sh                  # Скрипт запуска (Linux)
└── start.bat/start.sh      # Скрипты от Kubek
```

**Важно:**
- Forge 1.20.1+ не создаёт отдельный `universal.jar`
- Используется `run.bat`/`run.sh` с аргументами из `win_args.txt`/`unix_args.txt`
- Kubek автоматически добавляет `nogui` для запуска без GUI

### Fabric

**Процесс установки:**
1. Скачивается серверный JAR Fabric
2. Сохраняется как `fabric-{version}-server.jar`
3. Создаются стандартные файлы запуска

**Особенности:**
- Fabric не требует установки, просто скачивается JAR
- Использует собственные маппинги (Intermediary)
- Требует Fabric API для работы модов

### NeoForge

**Процесс установки:**
Аналогичен Forge:
1. Скачивается `neoforge-{version}-installer.jar`
2. Запускается с флагом `--installServer`
3. Создаются файлы сервера

## Зеркала для загрузки

Kubek использует несколько источников для загрузки:

### Forge
1. **Основной:** `https://maven.minecraftforge.net/`
2. **BMCLAPI:** `https://bmclapi2.bangbang93.com/maven/` (Китай, работает в РФ)
3. **FastMirror:** `https://www.fastmirror.net/` (Китай)

### Fabric
1. **Основной:** `https://meta.fabricmc.net/`
2. **BMCLAPI:** `https://bmclapi2.bangbang93.com/fabric-meta/`

### NeoForge
1. **Основной:** `https://maven.neoforged.net/`
2. **BMCLAPI:** `https://bmclapi2.bangbang93.com/maven/`

**Автоматическое переключение:**
- Если основной источник недоступен, Kubek автоматически переключается на зеркало
- Таймаут: 2 минуты без прогресса
- Логи показывают переключение: `[Download] Timeout for ..., trying next mirror...`

## Настройка памяти

Kubek автоматически настраивает `user_jvm_args.txt` для Forge/NeoForge:

```
# user_jvm_args.txt (автоматически создаётся Kubek)
-Xmx4G  # Выделенная память из настроек сервера
```

**Рекомендации:**
- Минимум 2GB для легких сборок (до 20 модов)
- 4-6GB для средних сборок (20-50 модов)
- 8GB+ для тяжелых сборок (50+ модов)

## Решение проблем

### Загрузка зависает на 0%

**Причина:** Основной источник недоступен

**Решение:**
1. Подождите 2 минуты - Kubek автоматически переключится на зеркало
2. Проверьте логи: `[Download] Timeout for ..., trying next mirror...`
3. Если все зеркала недоступны - скачайте installer вручную

### Ручная загрузка Forge installer

1. Скачайте с официального сайта: https://files.minecraftforge.net/
2. При создании сервера выберите "Загрузить свой файл"
3. Укажите скачанный `forge-{version}-installer.jar`

### Ошибка установки (exit code: 1)

**Причины:**
- Неправильная версия Java
- Недостаточно памяти
- Повреждённый installer

**Решение:**
1. Проверьте версию Java (Forge 1.17+ требует Java 17+)
2. Увеличьте выделенную память
3. Переустановите сервер

### Сервер не запускается после установки

**Проверьте:**
1. Наличие `run.bat`/`run.sh` в папке сервера
2. Наличие `libraries/` с файлами
3. Логи установки: `[Installer] Installation completed`

**Команды для проверки:**
```bash
# Windows
dir servers\my-forge-server

# Linux
ls -la servers/my-forge-server/
```

## Логирование

Kubek подробно логирует процесс установки:

```
[Installer] Installation completed, searching for server jar...
[Installer] Files in server directory: forge-1.20.1-installer.jar, libraries, run.bat, ...
[Installer] Found installer log: forge-1.20.1-installer.jar.log
[Installer] Forge installer log confirms successful installation
[Installer] run.bat exists, using as server entry point
[Installer] Created start.bat with nogui argument
```

## Поддерживаемые версии

### Forge
- **Минимальная:** Minecraft 1.5.2
- **Максимальная:** Minecraft 1.20.4+
- **Рекомендуемая:** Minecraft 1.20.1 (стабильная)

### Fabric
- **Минимальная:** Minecraft 1.14
- **Максимальная:** Minecraft 1.20.4+
- **Рекомендуемая:** Minecraft 1.20.1 (стабильная)

### NeoForge
- **Минимальная:** Minecraft 1.20.1
- **Максимальная:** Minecraft 1.20.4+
- **Рекомендуемая:** Minecraft 1.20.1 (единственная стабильная)

## Дополнительные ресурсы

- **Официальный сайт Forge:** https://files.minecraftforge.net/
- **Официальный сайт Fabric:** https://fabricmc.net/
- **Официальный сайт NeoForge:** https://neoforged.net/
- **Документация BMCLAPI:** https://bmclapidoc.bangbang93.com/

## Поддержка

Если возникли проблемы:
1. Проверьте логи Kubek в папке `logs/`
2. Проверьте логи установки в папке сервера
3. Убедитесь, что используется правильная версия Java
4. Попробуйте ручную загрузку installer
