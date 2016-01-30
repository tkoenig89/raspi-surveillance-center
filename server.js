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
            var path = decodeURI(path);
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
        }
    } catch (ex) {
        res.writeHead(500);
        res.end(ex.message);
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