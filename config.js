var CONFIG = {
    SERVER: {
        archiveImages: true,
        archiveFolder: "/home/pi/archive",
        maxFilesInArchive: 20
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
    PERMISSIONS: {
        ACCESS_CAMERA: "Admin,View",
        ACCESS_ARCHIVE: "Admin"
    },
    LOGGER: {
        LOG_MODE: 2 //0: nothing, 1: error only, 2: log & error, 3: log & debug & error
    }
};

if (typeof (module) !== "undefined" && module.exports) {
    module.exports = CONFIG;
}