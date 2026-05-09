let refreshIntervals = {};
let isItFirstLogRefresh = false;
let previousConsoleUpdateLength = 0;
let timeStampRegexp = /\[[0-9]{2}\:[0-9]{2}\:[0-9]{2}\]/gm;

class KubekRefresher {
    // Добавить рефреш-интервал
    static addRefreshInterval = (interval, handler, name) => {
        refreshIntervals[name] = setInterval(handler, interval);
    }

    // Удалить рефреш-интервал
    static removeRefreshInterval = (name) => {
        clearInterval(refreshIntervals[name]);
    }

    // Добавить интервал обновления server header (каждые 2 секунды)
    static addRefreshServerHeaderInterval = () => {
        this.addRefreshInterval(1500, () => {
            // Проверяем, что selectedServer существует и валиден
            if (typeof selectedServer !== "undefined" && selectedServer && selectedServer !== "undefined") {
                KubekServerHeaderUI.refreshServerHeader(() => {
                });
            }
        }, "serverHeader");
    };

    // Добавить интервал обновления server log (каждые 650 мсек)
    static addRefreshServerLogInterval = () => {
        this.addRefreshInterval(650, () => {
            this.refreshConsoleLog();
        }, "serverConsole");
    };

    // Добавить интервал обновления использования рес-ов (каждые 4 сек)
    static addRefreshUsageInterval = () => {
        this.addRefreshInterval(5000, () => {
            if (typeof KubekConsoleUI !== "undefined") {
                KubekHardware.getUsage((usage) => {
                    KubekConsoleUI.refreshUsageItems(usage.cpu, usage.ram.percent, usage.ram);
                });
            }
        }, "usage");
    }

    // Обновить текст в консоли
    static refreshConsoleLog = () => {
        let consoleTextElem = $("#console-text");
        if (consoleTextElem.length !== 0) {
            let searchVal = $("#console-search").val();
            if (searchVal) searchVal = searchVal.toLowerCase();

            KubekServers.getServerLog(selectedServer, (serverLog) => {
                if (previousConsoleUpdateLength === serverLog.length) {
                    return;
                }
                
                // Check if user is near bottom before update
                const isAtBottom = (consoleTextElem[0].scrollHeight - consoleTextElem.scrollTop() - consoleTextElem.outerHeight()) < 50;
                
                previousConsoleUpdateLength = serverLog.length;
                let parsedServerLog = serverLog.split(/\r?\n/);
                let fullHtml = "";
                
                parsedServerLog.forEach(function (line) {
                    if (searchVal && line.toLowerCase().indexOf(searchVal) === -1) return;
                    
                    let html_text = "";
                    let parsedText = ANSIParse(KubekUtils.linkify(mineParse(line).raw));
                    
                    if (parsedText.length > 1) {
                        let joinedLine = "";
                        parsedText.forEach((item) => {
                            let style = "";
                            if (item.bold) style += "font-weight:bold;";
                            if (item.foreground) style += "color:" + item.foreground + ";";
                            joinedLine += "<span style='" + style + "'>" + item.text + "</span>";
                        });
                        html_text += joinedLine + "<br>";
                    } else {
                        html_text += (parsedText[0] ? parsedText[0].text : "") + "<br>";
                    }

                    // Parse timestamps
                    html_text = html_text.replace(timeStampRegexp, (match) => {
                        return "<span style='color: var(--bg-dark-accent-lighter);'>" + match + "</span>";
                    });
                    
                    fullHtml += html_text;
                });

                consoleTextElem.html(fullHtml);

                // Scroll to bottom if it's first refresh or user was already at bottom
                if (isItFirstLogRefresh === false || isAtBottom) {
                    isItFirstLogRefresh = true;
                    consoleTextElem.scrollTop(consoleTextElem[0].scrollHeight);
                }
            });
        }
    }

    // Интервал обновления списка задач
    static addRefreshTasksInterval = () => {
        this.addRefreshInterval(500, () => {
            KubekTasksUI.refreshTasksList();
        }, "tasksList");
    }

    // Проверка здоровья панели
    static addHealthCheckInterval = () => {
        setInterval(() => {
            KubekRequests.get("/kubek/health", (health) => {
                if (health === false) {
                    console.error("[Health] Failed to get health status");
                } else {
                    console.log("[Health] Panel status: " + health.status);
                }
            });
        }, 60000); // Раз в минуту
    }
}