var Server = require("./modules/Server"),
    CONSTANTS = require("./public/constants"),
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
        ID: server.idTracker(),
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
        RemoveCam: removeCam
    };

    function setCam(clientID, imgPath) {
        var cam = getCamById(clientID);
        if (!cam) {
            cam = new Camera(clientID, imgPath);
            _cams.push(cam);
        } else {
            cam.Filepath = imgPath;
            cam.TimeStamp = getTimeStamp(new Date());
        }
    }

    function getCam(id) {
        return getCamById(id);
    }

    function getAllCams() {
        return _cams;
    }

    function removeCam(id) {
        var idxAndCam = getCamAndIndexById(id);
        var idx = idxAndCam[0];
        if (idx >= 0) {
            _cams.splice(idx, 1);

            //TODO: remove the image from hdd
            //idxAndCam[1].Filepath
        }
    }

    function Camera(id, path) {
        this.Filepath = path;
        this.ID = id;
        this.TimeStamp = getTimeStamp(new Date());
    }

    function getCamById(id) {
        if (id) {
            var len = _cams.length;
            for (var i = 0; i < len; i++) {
                var cam = _cams[i];
                if (cam.ID == id) {
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

    /**
     * Creates a two digit string
     * @param   {number} i number to pad
     * @returns {string}
     */
    function padStr(i) {
        return i < 10 ? "0" + i : i.toString();
    }
})();

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
            Logger.log(path);
            hasAccess = ServerSecurity.testUserAccess(req, "Admin,Read,View");
            if (hasAccess) {
                //access granted
                provideFile(req, res, path);
            } else {
                //access denied due to invalid credentials
                res.writeHead(401);
                res.end("Denied");
            }
        } else if (path == "/refreshimage" && req.method == "POST") {
            hasAccess = ServerSecurity.testUserAccess(req, "Admin,Read,View");
            if (hasAccess) {
                //access granted
                var response = "Granted";
                var img = server.ImageWrapper.getImg();
                if (img) {
                    Logger.debug(img.GetTimeStamp);
                    response += ";" + img.Filepath + ";" + img.TimeStamp;
                }

                requestUpdatedImage();

                res.writeHead(200);
                res.end(response);
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

//request a new image from the mobile client
var lastRequest = -1;
var requestImageOnlyEachMs = 15000;

function requestUpdatedImage() {
    var time = (new Date()).getTime();
    //allow updates only after the defined timeframe
    if (lastRequest < 0 || lastRequest <= time - requestImageOnlyEachMs) {
        lastRequest = time;
        var camClients = server.getClientsByType(CONSTANTS.TYPES.CAM_CLIENT);
        if (camClients && camClients.length > 0) {
            Logger.log("Camera found", camClients[0].ID);
            camClients[0].sendEventOnly(STATES.IMG_REQ);
        }
    }
}

//returns a file from the public folder
function provideFile(req, res, path) {
    var file = fs.readFile(__dirname + path, function (err, data) {
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