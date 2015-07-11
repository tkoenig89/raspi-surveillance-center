var Server = require("./modules/Server"),
    CONSTANTS = require("./public/constants"),
    Logger = require("./modules/Logger"),
    STATES = CONSTANTS.STATES,
    ServerSecurity = require("./Security.js"),
    fs = require('fs');

var server = new Server({
    port: 8080
});

server.on("http", function (serv, req, res, path) {
    handleHttp(req, res, path);
});

server.on("connected", function (serv, ws) {
    Logger.log("client connected", serv.ID, serv.TYPE);
    var client = server.addClient(ws);

    client.sendEventOnly(STATES.SETUP_REQ);
});

function setupClientEventHandlers(client, server) {
    //Handle connection setup
    /*config[STATES.SETUP] = function (msgObj, connection) {
        //update connection information
        connection.details.type = msgObj.type;
        Logger.log("Setup done:")
        connection.log(true);

        //send setup completion notice
        connection.sendState(STATES.SETUP_DONE);
    };

    //Client is asking for cam image
    config[STATES.IMG_REQ] = handleImgRequest;
    config[STATES.BINARY_START_REQ] = handleBinaryStart;
    config[STATES.BINARY] = handleBinaryData;
    config[STATES.BINARY_CLOSE] = handleBinaryClose;
    */

    client.on(STATES.SETUP, handleSetup);        
    client.on(STATES.CLOSE, handleClose);

    function handleClose() {
        //todo: remove event listers!
        server.removeClient(client);
        client = null;
    }

    function handleSetup(client, data) {
        //update connection information
        client.TYPE = data.type;

        //send setup completion notice
        client.sendEventOnly(STATES.SETUP_DONE);

        Logger.log("Setup", client.ID, client.TYPE);
    }
}

//responds to different http requests
function handleHttp(req, res, path) {
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
            var valid = ServerSecurity.validateToken(req, res);
            if (valid) {
                res.writeHead(200);
                res.end("Valid");
            } else {
                res.writeHead(401);
                res.end("Invalid");
            }
        } else if (path.indexOf("/private/") == 0) {
            //accessing the private area
            Logger.log(path);
            var validToken = ServerSecurity.testToken(req);
            if (validToken) {
                //access granted
                provideFile(req, res, path);
            } else {
                //access denied due to invalid credentials
                res.writeHead(401);
                res.end("Denied");
            }
        } else if (path == "/refreshimage" && req.method == "POST") {
            var validToken = ServerSecurity.testToken(req);
            if (validToken) {
                //access granted
                requestUpdatedImage();

                res.writeHead(200);
                res.end("Granted");
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