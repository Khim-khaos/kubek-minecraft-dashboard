class KubekFileManager {
    // Получить содержимое папки
    static readDirectory(path, cb) {
        KubekRequests.get("/fileManager/get?server=" + encodeURIComponent(selectedServer) + "&path=" + encodeURIComponent(path), cb);
    }

    // Переименовать файл
    static renameFile(path, newName, cb) {
        KubekRequests.get("/fileManager/rename?server=" + encodeURIComponent(selectedServer) + "&path=" + encodeURIComponent(path) + "&newName=" + encodeURIComponent(newName), cb);
    }

    // Удалить файл/директорию
    static delete(path, cb) {
        KubekRequests.get("/fileManager/delete?server=" + encodeURIComponent(selectedServer) + "&path=" + encodeURIComponent(path), cb);
    }

    // Создать новую директорию
    static newDirectory(path, name, cb) {
        KubekRequests.get("/fileManager/newDirectory?server=" + encodeURIComponent(selectedServer) + "&path=" + encodeURIComponent(path) + "&name=" + encodeURIComponent(name), cb);
    }

    // Скачать файл
    static downloadFile(path, cb) {
        window.open("/api/fileManager/download?server=" + encodeURIComponent(selectedServer) + "&path=" + encodeURIComponent(path), "_blank")
    }

    // Прочитать файл
    static readFile(path, cb) {
        this.readDirectory(path, (result) => {
            if (result === false) {
                cb(false);
            }
            cb(result.fileData);
        });
    }

    // Создать элемент для записи
    static startChunkWrite(path, cb){
        KubekRequests.get("/fileManager/chunkWrite/start?server=" + encodeURIComponent(selectedServer) + "&path=" + encodeURIComponent(path), cb);
    }

    // Дополнить элемент для записи
    static addChunkWrite(id, data, cb){
        KubekRequests.post("/fileManager/chunkWrite/add", cb, {id: id, data: data});
    }

    // Завершить элемент для записи
    static endChunkWrite(id, cb){
        KubekRequests.get("/fileManager/chunkWrite/end?id=" + encodeURIComponent(id), cb);
    }

    // Архивация
    static archive(path, name, cb) {
        KubekRequests.get("/fileManager/archive?server=" + encodeURIComponent(selectedServer) + "&path=" + encodeURIComponent(path) + "&name=" + encodeURIComponent(name), cb);
    }

    // Разархивация
    static unarchive(path, cb) {
        KubekRequests.get("/fileManager/unarchive?server=" + encodeURIComponent(selectedServer) + "&path=" + encodeURIComponent(path), cb);
    }
}