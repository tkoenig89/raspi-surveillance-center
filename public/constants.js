var CONST = {
    SERVICE_URL: "localhost:8080",
    TOKEN_HEADER: "security-token",
    TOKEN_TIMEOUT: 60,   //minutes
    TOKEN_ALGORITHM: "HS512",

    STATES: {
        SETUP: -1,
        SETUP_REQ: 1,
        SETUP_DONE: 2,
        IDLE: 10,
        IMG_REQ: 20,
        IMG_REQ_FINAL: 21,
        IMG_REQ_REJECT:22,
        BINARY: 40,
        BINARY_START_REQ: 41,
        BINARY_START_ACK: 42,
        BINARY_CLOSE: 43,
        NEW_IMAGE:50,
        DEFAULT: 100,
        CONNECTION_CLOSED:"close",
        CONNECTION_OPENED:"connected",
        ERROR:"error",
        PONG:"pong"
    },
    TYPES: {
        BROWSER_CLIENT: 0,
        CAM_CLIENT: 1,
        APP_CLIENT: 2
    },

    MIME_TYPES: {
        js: "application/javascript",
        html: "text/html",
        css: "text/css",
        extractMimeType: function (path) {
            if (path) {
                var fExt = path.match(/\.\w+$/);
                if (fExt.length == 1) {
                    return this[fExt[0].substr(1)];
                }
            }
            return null;
        }
    }
};

if (typeof (module) !== "undefined" && module.exports) {
    module.exports = CONST;
}