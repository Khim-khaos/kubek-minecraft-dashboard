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
    KubekRequests.get("/api/health", (data) => {
        if (data) {
            // Update CPU
            $("#sys-cpu-bar").css("width", data.cpu + "%");
            $("#sys-cpu-val").text(Math.round(data.cpu) + "%");
            
            // Update RAM
            const ramUsage = (data.ram.used / data.ram.total) * 100;
            $("#sys-ram-bar").css("width", ramUsage + "%");
            $("#sys-ram-val").text(Math.round(ramUsage) + "%");

            // Update Uptime
            if (data.uptime) {
                const hours = Math.floor(data.uptime / 3600);
                const minutes = Math.floor((data.uptime % 3600) / 60);
                $("#sys-uptime-val").text(`${hours}h ${minutes}m`);
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
