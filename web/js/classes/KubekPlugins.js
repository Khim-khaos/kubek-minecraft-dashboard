class KubekPlugins {
    // Список плагинов
    static getPluginsList(cb) {
        KubekRequests.get("/plugins/" + encodeURIComponent(selectedServer), cb);
    }

    // Список модов
    static getModsList(cb) {
        KubekRequests.get("/mods/" + encodeURIComponent(selectedServer), cb);
    }
}