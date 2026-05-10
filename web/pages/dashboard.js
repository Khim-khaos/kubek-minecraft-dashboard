$(function () {
    console.log("[Dashboard] Initializing...");
    
    // Load summary stats
    loadDashboardStats();
    
    // Load servers grid
    loadServersGrid();
    
    // Update interval
    const dashboardInterval = setInterval(() => {
        if (KubekPageManager.currentPage !== "dashboard") {
            clearInterval(dashboardInterval);
            return;
        }
        loadDashboardStats();
        updateServersStatus();
    }, 3000);
});

function loadDashboardStats() {
    KubekRequests.get("/health", (data) => {
        if (data) {
            const cpu = data.cpu || 0;
            const ramPercent = data.ram ? data.ram.percent : 0;

            // Update Header Stats
            if ($("#total-cpu-val").length > 0) {
                $("#total-cpu-bar").css("width", cpu + "%");
                $("#total-cpu-val").text(Math.round(cpu) + "%");
            }
            if ($("#total-ram-val").length > 0) {
                $("#total-ram-bar").css("width", ramPercent + "%");
                $("#total-ram-val").text(Math.round(ramPercent) + "%");
            }

            // Update Card Stats
            if ($("#sys-cpu-val").length > 0) {
                $("#sys-cpu-bar").css("width", cpu + "%");
                $("#sys-cpu-val").text(Math.round(cpu) + "%");
            }
            if ($("#sys-ram-val").length > 0) {
                $("#sys-ram-bar").css("width", ramPercent + "%");
                $("#sys-ram-val").text(Math.round(ramPercent) + "%");
            }

            // Update Uptime
            if (data.panel && data.panel.uptime && $("#sys-uptime-val").length > 0) {
                $("#sys-uptime-val").text(KubekUtils.humanizeSeconds(data.panel.uptime));
            }
        }
    });
}

function loadServersGrid() {
    KubekServers.getServersList((servers) => {
        $("#total-servers-count").text(servers.length);
        const grid = $("#dashboard-servers-grid");
        grid.empty();
        
        let runningCount = 0;
        
        servers.forEach(server => {
            const card = $(`
                <div class="server-card animate__animated animate__fadeIn" id="dash-server-${server}">
                    <div class="status-badge"></div>
                    <img src="/api/servers/${server}/icon" class="server-icon" alt="${server}">
                    <h4>${server}</h4>
                    <div class="server-version">...</div>
                    <div class="server-mini-stats">
                        <span class="cpu-usage">CPU: 0%</span>
                        <span class="ram-usage">RAM: 0MB</span>
                    </div>
                </div>
            `);
            
            card.on("click", () => {
                window.localStorage.selectedServer = server;
                KubekUI.loadSelectedServer();
                KubekPageManager.gotoPage("console");
            });
            
            grid.append(card);
            
            // Load individual server info
            KubekServers.getServerInfo(server, (info) => {
                if (info) {
                    $(`#dash-server-${server} .server-version`).text(info.core + " " + info.coreVersion);
                    if (info.status === "running") {
                        $(`#dash-server-${server}`).addClass("running");
                        runningCount++;
                        $("#running-servers-count").text(runningCount);
                    }
                }
            });
        });
    });
}

function updateServersStatus() {
    KubekServers.getServersList((servers) => {
        let runningCount = 0;
        servers.forEach(server => {
            KubekServers.getServerInfo(server, (info) => {
                if (info) {
                    const card = $(`#dash-server-${server}`);
                    if (info.status === "running") {
                        card.addClass("running");
                        runningCount++;
                        
                        // Update usage if available
                        if (info.usage) {
                            card.find(".cpu-usage").text("CPU: " + Math.round(info.usage.cpu) + "%");
                            card.find(".ram-usage").text("RAM: " + Math.round(info.usage.ram / 1024 / 1024) + "MB");
                        }
                    } else {
                        card.removeClass("running");
                        card.find(".cpu-usage").text("CPU: 0%");
                        card.find(".ram-usage").text("RAM: 0MB");
                    }
                }
                $("#running-servers-count").text(runningCount);
            });
        });
    });
}
