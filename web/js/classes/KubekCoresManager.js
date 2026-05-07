class KubekCoresManager {
    // Получить список всех ядер
    static getList(cb) {
        KubekRequests.get("/cores", cb);
    }

    // Получить список версий ядра
    static getCoreVersions(core, cb) {
        KubekRequests.get("/cores/" + core, cb);
    }

    // Получить ссылку на скачивание ядра
    static getCoreURL(core, version, cb) {
        KubekRequests.get("/cores/" + core + "/" + version, cb);
    }

    // Получить список версий Minecraft
    static getMinecraftVersions(cb) {
        KubekRequests.get("/cores/minecraft-versions", cb);
    }

    // Получить список ядер, поддерживающих конкретную версию Minecraft
    static getCoresForMCVersion(mcVersion, cb) {
        KubekRequests.get("/cores/for-mc-version/" + mcVersion, cb);
    }

    // Получить список версий/сборок ядра для конкретной версии Minecraft
    static getCoreVersionsForMCVersion(core, mcVersion, cb) {
        KubekRequests.get("/cores/" + core + "/for-mc-version/" + mcVersion, cb);
    }
}