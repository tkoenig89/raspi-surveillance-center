var Server = require("./modules/Server"),
    CONSTANTS = require("./public/constants"),
    CONFIG = require("./config.js"),
    ClientStub = require("./modules/ClientStub"),
    Logger = require("./modules/Logger"),
    STATES = CONSTANTS.STATES,
    ServerSecurity = require("./modules/Security.js"),
    fs = require('fs');

var server = new Server({
    port: CONSTANTS.SERVICE_PORT,
    keyFile: CONSTANTS.SECURE_CONNECTION && (__dirname + "/sslcert/key.pem"),
    certFile: CONSTANTS.SECURE_CONNECTION && (__dirname + "/sslcert/cert.pem"),
    sessionID: ServerSecurity.getSessionID()
});

server.on("http", function (serv, req, res, path) {
    handleHttp(req, res, path);
});

server.on("connected", function (serv, ws) {
    //add a newly connected client to the clientList and send setup request
    var clientStub = new ClientStub({
        ws: ws,
        server: server
    });
    server.clients.push(clientStub);
});


Server.prototype.ImageWrapper = (function ImgWrapper() {
    var _cams = [];

    return {
        SetCam: setCam,
        GetCam: getCam,
        GetAllCams: getAllCams,
        DeaktivateCam: deaktivateCam
    };

    function setCam(name, id, imgPath) {
        var cam = getCamByName(name);
        if (!cam) {
            cam = new Camera(name, id, imgPath);
            _cams.push(cam);
        } else {
            cam.ID = id;
            cam.IsConnected = true;
            cam.Filepath = imgPath;
            cam.TimeStamp = getTimeStamp(new Date());
        }
        return cam;
    }

    function getCam(name) {
        return getCamByName(name);
    }

    function getAllCams() {
        return _cams;
    }

    function deaktivateCam(name) {
        var cam = getCamByName(name);
        if (cam) {
            cam.IsConnected = false;
            return cam;
        }
    }

    function Camera(name, id, path) {
        this.Filepath = path;
        this.ID = id;
        this.Name = name;
        this.TimeStamp = getTimeStamp(new Date());
        this.IsConnected = true;
    }

    function getCamByName(name) {
        if (name) {
            var len = _cams.length;
            for (var i = 0; i < len; i++) {
                var cam = _cams[i];
                if (cam.Name == name) {
                    return cam;
                }
            }
        }
        return null;
    }

    function getCamAndIndexById(id) {
        if (id) {
            var idx = -1;
            var len = _cams.length;
            for (var i = 0; i < len; i++) {
                if (_cams[i].ID === id) {
                    return [i, _cams[i]];
                }
            }
        }
        return [-1, null];
    }
})();

/**
 * Returns a list of all cameras to authorized users
 * @param   {string} securityToken 
 * @returns {Camera[]} 
 */
Server.prototype.GetAllCameras = function getAllCameras(securityToken) {
    try {
        if (ServerSecurity.TestToken(securityToken, CONFIG.PERMISSIONS.ACCESS_CAMERA)) {
            var camList = this.ImageWrapper.GetAllCams();
            Logger.debug("Cameralist:", camList);

            return camList;
        } else {
            Logger.log("unauthorized request");
        }
    } catch (ex) {
        Logger.err("server.GetAllCameras", ex.message);
    }
    return null;
};


Server.prototype.GetArchivedImages = function getArchivedImages(securityToken) {
    try {
        if (ServerSecurity.TestToken(securityToken, CONFIG.PERMISSIONS.ACCESS_ARCHIVE)) {
            return getAllArchivedFolders();
        } else {
            Logger.log("unauthorized request");
        }
    } catch (ex) {
        Logger.err("server.GetArchivedImages", ex.message);
    }
    return null;
}


Server.prototype.ImageUpdateRequest = function imageUpdateRequest(token, camID) {
    try {
        if (ServerSecurity.TestToken(token, CONFIG.PERMISSIONS.ACCESS_CAMERA)) {
            if (camID) {
                var camera = this.findClientById(camID);
                if (camera) {
                    camera.sendEventOnly(STATES.IMG_REQ);
                }
            }
        } else {
            Logger.log("unauthorized request");
        }
    } catch (ex) {
        Logger.err("server.ImageUpdateRequest", camID, ex.message);
    }
};

Server.prototype.NotifyAllBrowserClients = function notifyAllBrowserClients(camName, removed) {
    try {
        //send update to all browsers:
        var stateToSend = removed ? CONSTANTS.STATES.REMOVED_IMAGE : CONSTANTS.STATES.NEW_IMAGE;

        var browsers = this.getClientsByType(CONSTANTS.TYPES.BROWSER_CLIENT);
        var cam = this.ImageWrapper.GetCam(camName);
        if (cam && browsers && browsers.length > 0) {
            for (var i in browsers) {
                browsers[i].send(cam, stateToSend);
            }
        }
    } catch (ex) {
        Logger.err("server.NotifyAllBrowserClients", camName, removed, ex.message);
    }
};

/**
 * Adds or updates an image
 * @param {string} camName       Display name of the camera
 * @param {number} camID         Identifier of this camera
 * @param {string} imageFilepath path to the image file
 */
Server.prototype.AddOrUpdateImage = function addOrUpdateImage(camName, camID, imageFilepath) {
    try {
        var cam = this.ImageWrapper.SetCam(camName, camID, imageFilepath);

        //notify the browsers
        this.NotifyAllBrowserClients(camName);

        if (CONFIG.SERVER.archiveImages) {
            archiveCameraImage(cam);
        }
    } catch (ex) {
        Logger.err("server.AddOrUpdateImage", camID, ex.message);
    }
};

Server.prototype.GetProjektFolder = function getProjektFolder() {
    Logger.debug("Project directory:", __dirname);
    return __dirname;
};

//responds to different http requests
function handleHttp(req, res, path) {
    var hasAccess = false;
    try {
        if (path == "/") {
            //index.html
            provideFile(req, res, '/public/index.html');
        } else if (path.indexOf("/public/") == 0) {
            //html/css/js from public folder
            provideFile(req, res, path);
        } else if (path == "/login" && req.method == 'POST') {
            //login
            ServerSecurity.Login(req, res);
        } else if (path == "/validateToken" && req.method == 'POST') {
            //Token validation
            hasAccess = ServerSecurity.refreshToken(req, res);
            if (hasAccess) {
                res.writeHead(200);
                res.end("Valid");
            } else {
                res.writeHead(401);
                res.end("Invalid");
            }
        } else if (path.indexOf("/private/") == 0) {
            //accessing the private area
            var path = decodeURI(path);
            Logger.log(path);
            hasAccess = ServerSecurity.testUserAccess(req, CONFIG.PERMISSIONS.ACCESS_CAMERA);
            if (hasAccess) {
                //access granted
                provideFile(req, res, path);
            } else {
                //access denied due to invalid credentials
                res.writeHead(401);
                res.end("Denied");
            }
        } else if (path.indexOf("/archive/") == 0) {
            //accessing the private area
            var path = decodeURI(path);
            var subPath = path.substr(path.indexOf("/archive/") + 8);
            path = CONFIG.SERVER.archiveFolder + subPath;
            Logger.debug(path);

            hasAccess = ServerSecurity.testUserAccess(req, CONFIG.PERMISSIONS.ACCESS_ARCHIVE);
            if (hasAccess) {
                //access granted
                provideFile(req, res, path, true);
            } else {
                //access denied due to invalid credentials
                res.writeHead(401);
                res.end("Denied");
            }
        }
    } catch (ex) {
        res.writeHead(500);
        res.end(ex.message);
    }
}

//returns a file from the public folder
function provideFile(req, res, path, pathIsAbsolute) {
    var filePath = !pathIsAbsolute ? __dirname + path : path;
    var file = fs.readFile(filePath, function (err, data) {
        if (err) {
            res.writeHead(500);
            return res.end("Error: unable to load '" + path) + "'";
        }
        res.writeHead(200, {
            'Content-Type': CONSTANTS.MIME_TYPES.extractMimeType(path)
        });
        res.end(data);
    });
}


function archiveCameraImage(cam) {
    try {
        var targetFolder = CONFIG.SERVER.archiveFolder + cam.Name + "/";
        var fileName = getFileNameTimeStamp(new Date()) + cam.Filepath.substr(cam.Filepath.lastIndexOf("."));
        var targetPath = targetFolder + fileName;
        var sourcePath = __dirname + cam.Filepath;

        //make sure the folder exists
        var stats = null;
        try {
            var stats = fs.statSync(targetFolder);
        } catch (ex) {}
        if (!stats || !stats.isDirectory()) {
            fs.mkdirSync(targetFolder);
        }

        Logger.debug("Copy From:", sourcePath);
        Logger.debug("Copy To:", targetPath);

        //copy file
        fs.createReadStream(sourcePath).pipe(fs.createWriteStream(targetPath));

        Logger.debug("Copy Done!");
    } catch (ex) {
        Logger.err("Archive Error", cam, ex.message);
    }
}

function getAllArchivedFolders(callback) {
    var folderCount = 0;
    var folderList = [];
    if (CONFIG.SERVER.archiveImages) {
        var folderList = [];
        fs.readdir(CONFIG.SERVER.archiveFolder, function (err, files) {
            if (err) {
                Logger.err("Error accessing archive folder:", err);
                return;
            } else {
                if (files && files.length > 0) {
                    Logger.debug("Folders found:", files.length);
                    var folderCount = files.length;
                    for (var i = 0; i < folderCount; i++) {
                        var folderName = files[i];
                        var folder = {
                            Name: folderName
                        };
                        var folderPath = CONFIG.SERVER.archiveImages + fileName;
                        getFilesFromFolder(folderPath, folderName, function (err, fileList) {
                            if (err) {
                                Logger.err("Error accessing archive folder:", folderPath, err);
                                callback(err);
                            } else {
                                folder.FileList = fileList;
                                folderList.push(folder);
                                checkIfFoldersReady();
                            }
                        });
                    }
                } else {
                    Logger.log("No folders to cleanup");
                }
            }

        });
    } else {
        return null;
    }

    function checkIfFoldersReady() {
        if (folderList.length >= folderCount) {
            callback(folderList);
        }
    }

    function getFilesFromFolder(folderPath, folderName, callback) {
        fs.stat(filePath, function (err, stats) {
            if (err) {
                callback(err);
            } else {
                if (stats.isDirectory()) {
                    fs.readdir(folderPath, function (err, files) {
                        if (err) {
                            callback(err);
                        } else {
                            var fileList = [];
                            if (files && files.length > 0) {
                                var len = files.length;
                                for (var i = 0; i < len; i++) {
                                    var fileName = files[i];
                                    var fileObj = {
                                        Name: fileName,
                                        filePath: "/archive/" + folderName + "/" + fileName
                                    };
                                    fileList.push(fileObj);
                                }
                            }
                            callback(null, fileList);
                        }
                    });
                }
                callback("no folder");
            }
        });
    }

    /**
     * Creates a string representation of the provided date object
     * @param   {object} dateObj javascript date object
     * @returns {string} string representation
     */
    function getTimeStamp(dateObj) {
        var dateStr = padStr(dateObj.getDate()) + "." + padStr(dateObj.getMonth() + 1) + "." + dateObj.getFullYear();
        var timeStr = padStr(dateObj.getHours()) + ":" + padStr(dateObj.getMinutes());
        return dateStr + " " + timeStr + " Uhr";
    }

    function getFileNameTimeStamp(dateObj) {
        var dateStr = dateObj.getFullYear() + padStr(dateObj.getMonth() + 1) + padStr(dateObj.getDate());
        var timeStr = padStr(dateObj.getHours()) + padStr(dateObj.getMinutes());
        return dateStr + "T" + timeStr;
    }

    /**
     * Creates a two digit string
     * @param   {number} i number to pad
     * @returns {string}
     */
    function padStr(i) {
        return i < 10 ? "0" + i : i.toString();
    }