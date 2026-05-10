consoleCpuUsageBar = new KubekCircleProgress($("#cpu-usage-bar"), 100, 100, "var(--bg-dark-accent)", "var(--bg-dark-accent-light)", "var(--bg-primary-500)");
consoleCpuUsageBar.create();
consoleRamUsageBar = new KubekCircleProgress($("#ram-usage-bar"), 100, 100, "var(--bg-dark-accent)", "var(--bg-dark-accent-light)", "var(--bg-primary-500)");
consoleRamUsageBar.create();
$("#ram-usage-bar").hide();
$("#cpu-usage-bar").hide();

KubekConsoleUI = class {
    // Обновить progress бары использования рес-ов
    static refreshUsageItems(cpu, ram, ramElem) {
        if (typeof consoleCpuUsageBar !== "undefined") consoleCpuUsageBar.setValue(cpu);
        if (typeof consoleRamUsageBar !== "undefined") consoleRamUsageBar.setValue(ram);
        
        if (typeof consoleCpuUsageBar !== "undefined") consoleCpuUsageBar.setActiveColor(KubekUtils.getProgressGradientColor(cpu));
        if (typeof consoleRamUsageBar !== "undefined") consoleRamUsageBar.setActiveColor(KubekUtils.getProgressGradientColor(ram));
        
        if (ramElem) {
            $("#ram-usage-text").text(KubekUtils.humanizeFileSize(ramElem.used) + " / " + KubekUtils.humanizeFileSize(ramElem.total));
        }

        if ($("#cpu-usage-bar").css("display") === "none") {
            $("#cpu-usage-spinner").hide();
            $("#ram-usage-spinner").hide();
            $("#ram-usage-bar").show();
            $("#cpu-usage-bar").show();
        }
    }
}

$(function () {
    KubekUI.setTitle("Kubek | {{sections.console}}");

    KubekHardware.getUsage((usage) => {
        KubekConsoleUI.refreshUsageItems(usage.cpu, usage.ram.percent, usage.ram);
    });

        // Persistent command history
    let commandHistory = [];
    try {
        const storedHistory = window.localStorage.getItem("kubek_cmd_history");
        if (storedHistory) {
            commandHistory = JSON.parse(storedHistory);
        }
    } catch (e) {
        console.error("Failed to load command history", e);
    }
    
    let historyIndex = -1;
    let tempInput = "";

    $("#cmd-input").on("keydown", (e) => {
        if (e.originalEvent.code === "Enter") {
            const cmd = $("#cmd-input").val();
            if (cmd.trim() !== "") {
                // Remove existing if it's already there (to move it to top)
                const existingIndex = commandHistory.indexOf(cmd);
                if (existingIndex !== -1) {
                    commandHistory.splice(existingIndex, 1);
                }
                
                commandHistory.unshift(cmd);
                if (commandHistory.length > 50) commandHistory.pop();
                
                // Save to localStorage
                window.localStorage.setItem("kubek_cmd_history", JSON.stringify(commandHistory));
                
                historyIndex = -1;
                tempInput = "";
            }
            KubekServers.sendCommandFromInput(selectedServer);
        } else if (e.originalEvent.code === "ArrowUp") {
            if (historyIndex === -1) {
                tempInput = $("#cmd-input").val();
            }
            
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                $("#cmd-input").val(commandHistory[historyIndex]);
            }
            e.preventDefault();
        } else if (e.originalEvent.code === "ArrowDown") {
            if (historyIndex > 0) {
                historyIndex--;
                $("#cmd-input").val(commandHistory[historyIndex]);
            } else if (historyIndex === 0) {
                historyIndex = -1;
                $("#cmd-input").val(tempInput);
            }
            e.preventDefault();
        }
    });

    $("#console-search").on("input", () => {
        previousConsoleUpdateLength = 0; // Force refresh
        KubekRefresher.refreshConsoleLog();
    });
})