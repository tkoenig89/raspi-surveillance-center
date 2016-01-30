var CONFIG = {
    SERVER: {
        archiveImages: false,
        archiveFolder: "/home/pi/archive"
    },
    AUTHENTICATION: {
        TOKEN_HEADER: "security-token",
        TOKEN_TIMEOUT: 60, //minutes
        TOKEN_ALGORITHM: "HS512"
    },
    CLIENT: {
        NAME: "Kamera 1",
        TIME_BETWEEN_PINGS: 30, //seconds between pings 
        CLIENT_IMG_FOLDER: "/imgs",
        CLIENT_IMG_FILENAME: "now.jpg",
        CLIENT_USE_PRJFOLDER: true
    },
    LOGGER: {
        LOG_MODE: 2 //0: nothing, 1: error only, 2: log & error, 3: log & debug & error
    }
};

if (typeof (module) !== "undefined" && module.exports) {
    module.exports = CONFIG;
}