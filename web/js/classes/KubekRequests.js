class KubekRequests {
    // Сделать AJAX-запрос с нужными настройками
    static makeAjaxRequest = (url, type, data = "", apiEndpoint = true, cb = () => {
    }) => {
        if (apiEndpoint) {
            url = KubekPredefined.API_ENDPOINT + url;
        }
        if(data !== ""){
            let ajaxSettings = {
                url: url,
                type: type.toString().toUpperCase(),
                data: data,
                success: function (response) {
                    cb(response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if(errorThrown === "Forbidden"){
                        KubekAlerts.addAlert("{{commons.failedToRequest}}", "warning", "{{commons.maybeUDoesntHaveAccess}}", 5000);
                    }
                    cb(false, textStatus, errorThrown);
                }
            };

            // Если данные - это FormData, отключаем обработку
            if (data instanceof FormData) {
                ajaxSettings.processData = false;
                ajaxSettings.contentType = false;
            } else if (typeof data === "object") {
                // Если это объект (не FormData), отправляем как JSON
                ajaxSettings.data = JSON.stringify(data);
                ajaxSettings.contentType = "application/json; charset=utf-8";
            }

            $.ajax(ajaxSettings);
        } else {
            $.ajax({
                url: url,
                type: type.toString().toUpperCase(),
                success: function (response) {
                    cb(response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if(errorThrown === "Forbidden"){
                        KubekAlerts.addAlert("{{commons.failedToRequest}}", "warning", "{{commons.maybeUDoesntHaveAccess}}", 5000);
                    }
                    cb(false, textStatus, errorThrown);
                }
            });
        }
    }

    // Функция для каждого типа запроса
    static get = (url, cb, apiEndpoint = true) => {
        this.makeAjaxRequest(url, "GET", "", apiEndpoint, cb);
    }

    static post = (url, cb, data = "", apiEndpoint = true) => {
        this.makeAjaxRequest(url, "POST", data, apiEndpoint, cb);
    }

    static put = (url, cb, data = "", apiEndpoint = true) => {
        this.makeAjaxRequest(url, "PUT", data, apiEndpoint, cb);
    }

    static delete = (url, cb, data = "", apiEndpoint = true) => {
        this.makeAjaxRequest(url, "DELETE", data, apiEndpoint, cb);
    }

    static head = (url, cb, data = "", apiEndpoint = true) => {
        this.makeAjaxRequest(url, "HEAD", data, apiEndpoint, cb);
    }

    static options = (url, cb, data = "", apiEndpoint = true) => {
        this.makeAjaxRequest(url, "OPTIONS", data, apiEndpoint, cb);
    }
}