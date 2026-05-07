// Массив ядер, для которых есть SVG иконки (остальные - PNG)
const SVG_CORES = ["velocity", "waterfall"];

CORE_GRID_ITEM_PLACEHOLDER = "<div class='card centered' data-id='$1'> <img alt='$0 logo' class='icon' src='/assets/icons/cores/$1$2'> <span class='title'>$0</span> </div>";
JAVA_ITEM_PLACEHOLDER = "<div class='item' data-type='$0' data-data='$1'> <span class='text'>$2</span> <span class='check material-symbols-rounded'>check</span> </div>";
SERVER_NAME_REGEXP = /^[a-zA-Z0-9\-\_]{1,20}$/;
AIKAR_FLAGS = "--add-modules=jdk.incubator.vector -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20";

currentSelectedCore = "";
currentSelectedVersion = "";
allServersList = [];

// Класс для кастомного выпадающего списка с поиском
class SearchableDropdown {
    constructor(elementId, options = {}) {
        this.container = document.getElementById(elementId);
        if (!this.container) return;
        
        this.trigger = this.container.querySelector('.dropdown-trigger');
        this.menu = this.container.querySelector('.dropdown-menu');
        this.searchInput = this.container.querySelector('.dropdown-search');
        this.filterInput = this.container.querySelector('.dropdown-filter');
        this.optionsContainer = this.container.querySelector('.dropdown-options');
        
        this.items = [];
        this.selectedValue = null;
        this.selectedText = '';
        this.onSelect = options.onSelect || (() => {});
        this.placeholder = options.placeholder || '';
        this.disabledPlaceholder = options.disabledPlaceholder || '';
        
        this.init();
    }
    
    init() {
        // Открытие/закрытие по клику на trigger
        this.trigger.addEventListener('click', (e) => {
            if (this.searchInput.disabled) return;
            e.stopPropagation();
            this.toggle();
        });
        
        // Закрытие при клике вне
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
        
        // Фильтрация при вводе
        this.filterInput.addEventListener('input', () => {
            this.filter(this.filterInput.value);
        });
        
        // Предотвращаем закрытие при клике в меню
        this.menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    toggle() {
        if (this.container.classList.contains('active')) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        // Закрываем другие открытые дропдауны
        document.querySelectorAll('.searchable-dropdown.active').forEach(d => {
            if (d !== this.container) d.classList.remove('active');
        });
        
        this.container.classList.add('active');
        this.filterInput.value = '';
        this.filter('');
        setTimeout(() => this.filterInput.focus(), 10);
    }
    
    close() {
        this.container.classList.remove('active');
    }
    
    setItems(items) {
        this.items = items;
        this.render();
    }
    
    render() {
        this.optionsContainer.innerHTML = '';
        
        if (this.items.length === 0) {
            this.optionsContainer.innerHTML = '<div class="dropdown-empty">Нет доступных вариантов</div>';
            return;
        }
        
        this.items.forEach(item => {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.dataset.value = item.value;
            option.innerHTML = `<span>${item.text}</span><span class="material-symbols-rounded">check</span>`;
            
            if (item.value === this.selectedValue) {
                option.classList.add('selected');
            }
            
            option.addEventListener('click', () => {
                this.select(item);
            });
            
            this.optionsContainer.appendChild(option);
        });
    }
    
    filter(query) {
        const normalizedQuery = query.toLowerCase().trim();
        const options = this.optionsContainer.querySelectorAll('.dropdown-option');
        let visibleCount = 0;
        
        options.forEach(option => {
            const text = option.querySelector('span').textContent.toLowerCase();
            if (text.includes(normalizedQuery)) {
                option.classList.remove('hidden');
                visibleCount++;
            } else {
                option.classList.add('hidden');
            }
        });
        
        // Показываем/скрываем сообщение "Ничего не найдено"
        let emptyMsg = this.optionsContainer.querySelector('.dropdown-empty');
        
        if (visibleCount === 0) {
            if (!emptyMsg) {
                emptyMsg = document.createElement('div');
                emptyMsg.className = 'dropdown-empty';
                emptyMsg.textContent = 'Ничего не найдено';
                this.optionsContainer.appendChild(emptyMsg);
            }
        } else if (emptyMsg) {
            emptyMsg.remove();
        }
    }
    
    select(item) {
        this.selectedValue = item.value;
        this.selectedText = item.text;
        this.searchInput.value = item.text;
        this.render();
        this.close();
        this.onSelect(item);
    }
    
    setValue(value) {
        const item = this.items.find(i => i.value === value);
        if (item) {
            this.select(item);
        }
    }
    
    clear() {
        this.selectedValue = null;
        this.selectedText = '';
        this.searchInput.value = '';
        this.render();
    }
    
    setEnabled(enabled) {
        this.searchInput.disabled = !enabled;
        if (!enabled) {
            this.close();
            this.searchInput.placeholder = this.disabledPlaceholder;
        } else {
            this.searchInput.placeholder = this.placeholder;
        }
    }
    
    getValue() {
        return this.selectedValue;
    }
}

// Глобальные переменные для дропдаунов
let mcVersionDropdown = null;
let coreTypeDropdown = null;
let coreVersionDropdown = null;

// Храним данные
let availableCores = {};  // Список доступных ядер
currentSelectedCore = "";
currentSelectedVersion = "";

$(function () {
    KubekUI.setTitle("Kubek | {{commons.create}} {{commons.server.lowerCase}}");

    // Заполняем список серверов для проверки на существование
    $("#servers-list-sidebar .sidebar-item span:last-child").each((i, el) => {
        allServersList.push($(el).text());
    });

    // Инициализируем кастомные дропдауны
    initSearchableDropdowns();

    // Загружаем список ядер через существующий API
    refreshServerCoresList(() => {
        // Загружаем список версий Minecraft и типы ядер
        populateVersionDropdown();
        populateCoreTypeDropdown();
        refreshJavaList(() => {});
    });
    
    // Показываем новые дропдауны, скрываем старые элементы
    $("#core-selectors-container").show();
    $(".new-server-container #cores-grid").hide();
    $(".new-server-container #cores-versions-parent").hide();
    $(".new-server-container #server-port").val(25565);

    // Получаем кол-во ОЗУ, настраиваем поле ввода ОЗУ
    KubekRequests.get("/kubek/hardware/usage", (usage) => {
        let totalMemory = Math.ceil(Math.round(usage.ram.total / 1024 / 1024) / 512) * 512;
        let totalDigit = (totalMemory / 1024).toFixed(1) / 2;
        let maxMemory = (totalMemory / 1024).toFixed(1);
        $(".new-server-container #server-mem").val(totalDigit);
        $(".new-server-container #server-mem").attr("max", maxMemory);
        validateNewServerInputs();
    });
});

// Функция для валидации полей ввода
function validateNewServerInputs(){
    // Проверка на выбор файла ядра
    if($(".new-server-container #core-upload").css("display") !== "none" && $("#server-core-input")[0].value === ""){
        $(".new-server-container #create-server-btn").prop("disabled", true);
        $(".new-server-container #create-server-btn .text").text("{{newServerWizard.noCoreFile}}");
        return;
    }

    // Проверка имени сервера
    let sName = $(".new-server-container #server-name-input").val();
    if(!SERVER_NAME_REGEXP.test(sName)){
        $(".new-server-container #create-server-btn").prop("disabled", true);
        $(".new-server-container #create-server-btn .text").text("{{newServerWizard.noServerName}}");
        $(".new-server-container #server-name-input").addClass("error");
        return;
    } else {
        $(".new-server-container #server-name-input").removeClass("error");
    }

    // Проверка имени сервера на существование
    if(allServersList.includes(sName)){
        $(".new-server-container #create-server-btn").prop("disabled", true);
        $(".new-server-container #create-server-btn .text").text("{{newServerWizard.serverAlreadyExists}}");
        $(".new-server-container #server-name-input").addClass("error");
        return;
    } else {
        $(".new-server-container #server-name-input").removeClass("error");
    }

    // Проверка ввода памяти
    let memInput = $(".new-server-container #server-mem");
    if(memInput.val() < memInput.attr("min") && memInput.val() > memInput.attr("max") && memInput !== ""){
        $(".new-server-container #create-server-btn").prop("disabled", true);
        $(".new-server-container #create-server-btn .text").text("{{newServerWizard.noMemory}}");
        $(".new-server-container #server-mem").addClass("error");
        return;
    } else {
        $(".new-server-container #server-mem").removeClass("error");
    }

    // Проверка ввода порта
    let portInput = $(".new-server-container #server-port");
    if(portInput.val() < portInput.attr("min") && portInput.val() > portInput.attr("max") && portInput !== ""){
        $(".new-server-container #create-server-btn").prop("disabled", true);
        $(".new-server-container #create-server-btn .text").text("{{newServerWizard.noPort}}");
        $(".new-server-container #server-port").addClass("error");
        return;
    } else {
        $(".new-server-container #server-port").removeClass("error");
    }

    // Проверка выбора версии и ядра (через дропдауны)
    if($(".new-server-container #core-upload").css("display") === "none"){
        if(!currentSelectedCore || !currentSelectedVersion){
            $(".new-server-container #create-server-btn").prop("disabled", true);
            $(".new-server-container #create-server-btn .text").text("{{newServerWizard.noCoreSelected}}");
            return;
        }
    }

    // Если все проверки прошли
    $(".new-server-container #create-server-btn").prop("disabled", false);
    $(".new-server-container #create-server-btn .text").text("Создать " + sName);
}

// Инициализация кастомных дропдаунов
function initSearchableDropdowns() {
    // Дропдаун для версий Minecraft
    mcVersionDropdown = new SearchableDropdown('mc-version-dropdown', {
        placeholder: '{{newServerWizard.selectVersion}}',
        disabledPlaceholder: '{{newServerWizard.selectVersion}}',
        onSelect: (item) => {
            currentSelectedVersion = item.value;
            // При выборе версии Minecraft, включаем выбор типа ядра
            coreTypeDropdown.setEnabled(true);
            coreTypeDropdown.clear();
            coreVersionDropdown.setEnabled(false);
            coreVersionDropdown.clear();
            validateNewServerInputs();
        }
    });
    
    // Дропдаун для типа ядра
    coreTypeDropdown = new SearchableDropdown('mc-core-type-dropdown', {
        placeholder: '{{newServerWizard.selectCoreType}}',
        disabledPlaceholder: '{{newServerWizard.selectCoreFirst}}',
        onSelect: (item) => {
            currentSelectedCore = item.value;
            // При выборе типа ядра, загружаем его версии
            populateCoreVersionDropdown(item.value);
            validateNewServerInputs();
        }
    });
    coreTypeDropdown.setEnabled(false);
    
    // Дропдаун для версии ядра
    coreVersionDropdown = new SearchableDropdown('mc-core-version-dropdown', {
        placeholder: '{{newServerWizard.selectCoreType}}',
        disabledPlaceholder: '{{newServerWizard.selectCoreVersionFirst}}',
        onSelect: (item) => {
            currentSelectedVersion = item.value;
            // Синхронизируем со старым grid для совместимости
            syncCoreSelection(currentSelectedCore);
            validateNewServerInputs();
        }
    });
    coreVersionDropdown.setEnabled(false);
}

// Заполняем дропдаун версий Minecraft
function populateVersionDropdown() {
    KubekUI.showPreloader();
    KubekCoresManager.getMinecraftVersions((versions) => {
        if (versions && Array.isArray(versions)) {
            const versionItems = versions.map(v => ({
                value: v,
                text: v
            }));
            mcVersionDropdown.setItems(versionItems);
            
            // Выбираем первую версию по умолчанию
            if (versionItems.length > 0) {
                mcVersionDropdown.setValue(versionItems[0].value);
                currentSelectedVersion = versionItems[0].value;
                // Включаем выбор типа ядра
                coreTypeDropdown.setEnabled(true);
            }
        }
        KubekUI.hidePreloader();
    });
}

// Заполняем дропдаун типов ядер
function populateCoreTypeDropdown() {
    KubekCoresManager.getList((cores) => {
        availableCores = cores;
        const coreItems = Object.entries(cores).map(([id, core]) => ({
            value: id,
            text: core.displayName
        }));
        coreTypeDropdown.setItems(coreItems);
    });
}

// Заполняем дропдаун версий выбранного ядра
function populateCoreVersionDropdown(coreId) {
    KubekUI.showPreloader();
    KubekCoresManager.getCoreVersions(coreId, (versions) => {
        if (versions && Array.isArray(versions)) {
            const versionItems = versions.map(v => ({
                value: v,
                text: v
            }));
            coreVersionDropdown.setItems(versionItems);
            coreVersionDropdown.setEnabled(versionItems.length > 0);
            
            // Выбираем первую версию по умолчанию
            if (versionItems.length > 0) {
                // Пытаемся найти версию, соответствующую выбранной версии Minecraft
                const mcVersion = mcVersionDropdown.getValue();
                const matchingVersion = versionItems.find(v => v.value === mcVersion || v.value.includes(mcVersion));
                
                if (matchingVersion) {
                    coreVersionDropdown.setValue(matchingVersion.value);
                    currentSelectedVersion = matchingVersion.value;
                } else {
                    coreVersionDropdown.setValue(versionItems[0].value);
                    currentSelectedVersion = versionItems[0].value;
                }
                syncCoreSelection(coreId);
            }
        } else {
            coreVersionDropdown.setItems([]);
            coreVersionDropdown.setEnabled(false);
        }
        KubekUI.hidePreloader();
    });
}

// Синхронизация выбора ядра со старым grid (для совместимости)
function syncCoreSelection(coreId) {
    // Обновляем старый grid
    $(".new-server-container #cores-grid .card").removeClass("active");
    $(`.new-server-container #cores-grid .card[data-id="${coreId}"]`).addClass("active");
}

// Функция для обновления списка ядер (обновлённая для работы с дропдаунами)
function refreshServerCoresList(cb = () => {}) {
    currentSelectedCore = "";
    currentSelectedVersion = "";
    
    KubekCoresManager.getList((cores) => {
        // Заполняем старый grid для совместимости
        $(".new-server-container #cores-grid .card").off("click");
        $(".new-server-container #cores-grid").html("");
        
        for (const [, core] of Object.entries(cores)) {
            let iconExt = SVG_CORES.includes(core.name) ? ".svg" : ".png";
            $(".new-server-container #cores-grid").append(CORE_GRID_ITEM_PLACEHOLDER.replaceAll("$0", core.displayName).replaceAll("$1", core.name).replaceAll("$2", iconExt));
        }
        
        $(".new-server-container #cores-grid .card:first-child").addClass("active");
        
        // Биндим нажатия на карточки для обратной совместимости
        $(".new-server-container #cores-grid .card").on("click", function () {
            if (!$(this).hasClass("active")) {
                $(".new-server-container #cores-grid .card.active").removeClass("active");
                $(this).addClass("active");
                currentSelectedCore = $(this).data("id");
                // Синхронизируем с дропдауном
                if (coreDropdown) {
                    coreDropdown.setValue(currentSelectedCore);
                }
                validateNewServerInputs();
            }
        });
        
        cb(true);
    });
}

// Бинд на имя сервера
$(".new-server-container input").on("input", function(){
   validateNewServerInputs();
});

// Функция для обновления списка версий ядра (устаревшая, оставлена для совместимости)
function refreshCoreVersionsList(cb = () => {}) {
    // Новая реализация использует дропдауны, эта функция оставлена для обратной совместимости
    cb(true);
}

// Вызвать диалог для выбора файла ядра
function uploadCore() {
    $("#server-core-input").trigger("click");
    $("#server-core-input").off("change");
    $("#server-core-input").on("change", () => {
        $(".new-server-container #core-upload #uploaded-file-name").text($("#server-core-input")[0].files[0].name);
        validateNewServerInputs();
    });
}

// Обновить список Java
function refreshJavaList(cb) {
    $("#java-list-placeholder").show();
    $("#javas-list").hide();
    KubekJavaManager.getAllJavas((javas) => {
        $(".new-server-container #javas-list").html("");
        javas.installed.forEach((installed) => {
            $(".new-server-container #javas-list").append(JAVA_ITEM_PLACEHOLDER.replaceAll("$0", "installed").replaceAll("$1", installed).replaceAll("$2", installed));
        });
        javas.kubek.forEach((installed) => {
            $(".new-server-container #javas-list").append(JAVA_ITEM_PLACEHOLDER.replaceAll("$0", "kubek").replaceAll("$1", installed).replaceAll("$2", "Temurin Java " + installed + " ({{commons.installed}})"));
        });
        javas.online.forEach((online) => {
            $(".new-server-container #javas-list").append(JAVA_ITEM_PLACEHOLDER.replaceAll("$0", "online").replaceAll("$1", online).replaceAll("$2", "Temurin Java " + online));
        });
        $(".new-server-container #javas-list .item:first-child").addClass("active");

        // Биндим нажатия на версии
        $(".new-server-container #javas-list .item").on("click", function () {
            if (!$(this).hasClass("active")) {
                $(".new-server-container #javas-list .item.active").removeClass("active");
                $(this).addClass("active");
                validateNewServerInputs();
            }
        })
        $("#java-list-placeholder").hide();
        $("#javas-list").show();
        cb(true);
    });
}

// Собрать start script запуска сервера
function generateNewServerStart(){
    let result = "-Xmx" + $("#server-mem").val() * 1024 + "M";
    if($("#add-aikar-flags").is(":checked")){
        result = result + " " + encodeURIComponent(AIKAR_FLAGS);
    }
    return result;
}

// Биндим нажатия на категории ядра
$(".new-server-container #core-category .item").on("click", function () {
    if (!$(this).hasClass("active")) {
        $(".new-server-container #core-category .item.active").removeClass("active");
        $(this).addClass("active");
        if ($(this).data("item") === "list") {
            $("#core-selectors-container").show();
            $(".new-server-container #cores-grid").hide();
            $(".new-server-container #cores-versions-parent").hide();
            $(".new-server-container #core-upload").hide();
        } else {
            $("#core-selectors-container").hide();
            $(".new-server-container #cores-grid").hide();
            $(".new-server-container #cores-versions-parent").hide();
            $(".new-server-container #core-upload").show();
        }
        validateNewServerInputs();
    }
});

// Начать создание сервера
function prepareServerCreation(){
    $(".new-server-container #create-server-btn .text").text("{{newServerWizard.creationStartedShort}}");
    $(".new-server-container #create-server-btn").attr("disabled", "true");
    $(".new-server-container #create-server-btn .material-symbols-rounded:not(.spinning)").hide();
    $(".new-server-container #create-server-btn .material-symbols-rounded.spinning").show();

    let serverName = $(".new-server-container #server-name-input").val();
    let serverPort = $(".new-server-container #server-port").val();
    let serverCore = "";
    let serverVersion = "";
    let javaVersion = "";
    let startScript = "";

    javaVersion = $(".new-server-container #javas-list .item.active").data("data");
    startScript = generateNewServerStart();

    if($(".new-server-container #core-upload").css("display") === "none"){
        serverCore = currentSelectedCore;
        serverVersion = currentSelectedVersion;
        startServerCreation(serverName, serverCore, serverVersion, startScript, javaVersion, serverPort);
    } else {
        serverCore = $("#server-core-input")[0].files[0].name;
        serverVersion = serverCore;
        let formData = new FormData($("#server-core-form")[0]);
        KubekRequests.post("/cores/" + serverName, () => {
            startServerCreation(serverName, serverCore, serverVersion, startScript, javaVersion, serverPort);
        }, formData);
    }
}

function startServerCreation(serverName, serverCore, serverVersion, startScript, javaVersion, serverPort){
    KubekRequests.get("/servers/new?server=" + serverName + "&core=" + serverCore + "&coreVersion=" + serverVersion + "&startParameters=" + startScript + "&javaVersion=" + javaVersion + "&port=" + serverPort, () => {
        $(".new-server-container #after-creation-text").text("{{newServerWizard.creationCompleted}}");
    });
}