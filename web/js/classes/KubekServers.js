class KubekServers {
    // Получить список серверов
    static getServersList = (cb) => {
        KubekRequests.get("/servers", cb);
    };

    // Получить информацию о сервере (в т.ч. статус)
    static getServerInfo = (server, cb) => {
        KubekRequests.get("/servers/" + encodeURIComponent(server) + "/info", cb);
    };

    // Получить статусы всех серверов
    static getServersStatuses = (cb) => {
        KubekRequests.get("/servers/statuses", cb);
    };

    // Проверить сервер на существование
    static isServerExists = (server, cb) => {
        this.getServersList((sList) => {
            cb(sList.includes(server));
        });
    };

    // Получить лог сервера
    static getServerLog = (server, cb) => {
        KubekRequests.get("/servers/" + encodeURIComponent(server) + "/log", (log) => {
            if(log === false){
                cb("");
            } else {
                cb(log);
            }
        });
    };

    // Отправить команду на сервер
    static sendCommandToServer = (server, cmd) => {
        KubekRequests.post("/servers/" + encodeURIComponent(server) + "/send", () => {}, {cmd: cmd});
    };

    // Отправить команду на сервер из поля ввода консоли
    static sendCommandFromInput = (server) => {
        let inputElem = $("#cmd-input");
        if(inputElem.length === 1 && inputElem.val().trim() !== ""){
            this.sendCommandToServer(server, inputElem.val());
            inputElem.val("");
        }
    };

    // Запустить сервер
    static startServer = (server) => {
        KubekRequests.post("/servers/" + encodeURIComponent(server) + "/start");
    };

    // Перезапустить сервер
    static restartServer = (server) => {
        KubekRequests.post("/servers/" + encodeURIComponent(server) + "/restart");
    };

    // Остановить сервер
    static stopServer = (server) => {
        KubekRequests.post("/servers/" + encodeURIComponent(server) + "/stop");
    };

    // Принудительно завершить сервер
    static killServer = (server) => {
        KubekRequests.post("/servers/" + encodeURIComponent(server) + "/kill");
    };
}