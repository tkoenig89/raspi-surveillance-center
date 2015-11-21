var CONST = {
    SERVICE_URL: "localhost",
    SERVICE_PORT: 8080,
    SECURE_CONNECTION: false,
    TOKEN_HEADER: "security-token",
    TOKEN_TIMEOUT: 60, //minutes
    TOKEN_ALGORITHM: "HS512",
    LOG_MODE: 2, //0: nothing, 1: error only, 2: log & error, 3: log & debug & error
    TIME_BETWEEN_PINGS: 30, //seconds between pings 
    CLIENT_IMG_FOLDER: "/imgs",
    CLIENT_USE_PRJFOLDER: true,

    STATES: {
        SETUP: 1,
        SETUP_REQ: 2,
        SETUP_DONE: 3,
        IDLE: 10,
        IMG_REQ: 20,
        IMG_REQ_FINAL: 21,
        IMG_REQ_REJECT: 22,
        BINARY: 40,
        BINARY_START_REQ: 41,
        BINARY_START_ACK: 42,
        BINARY_CLOSE: 43,
        NEW_IMAGE: 50,
        DEFAULT: 100,
        CONNECTION_CLOSED: "close",
        CONNECTION_OPENED: "connected",
        ERROR: "error",
        PONG: "pong"
    },
    TYPES: {
        BROWSER_CLIENT: 0,
        0: "BROWSER_CLIENT",
        CAM_CLIENT: 1,
        1: "CAM_CLIENT",
        APP_CLIENT: 2,
        2: "APP_CLIENT"
    },
    ROLES: {
        ADMIN: "yxa23289u09asdj290",
        VIEWER: "8u3jhndas8921jn9w"
    }
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