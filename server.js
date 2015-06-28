var jwt = require("jsonwebtoken"), secret = "jksaniobkv893nfi982nfalkid983nbf",
    url = require('url'),
    fs = require('fs');

var CONST = require("./public/constants")
var Common = require("./common");
var STATES = CONST.STATES;
var TYPES = CONST.TYPES;
var ComHandler = Common.CommunicationHandler;
var ConnectionHandler = Common.ConnectionHandler;
var serverSessionID = Math.floor(Math.random() * 100000);
var requestImageOnlyEachMs = 15000;

//create a new ssl server
var sslServer = SSLServer(8080);

//confire message handling
ComHandler.configure(MessageHandling());

//Setup the websocket protocol on top of the https server
var WebSocketServer = require('ws').Server,
	wss = new WebSocketServer({ server: sslServer });


wss.on('connection', function (ws) {
    //update connection state
    var connection = ConnectionHandler.add(ws);

    ws.on('message', function (message) {
        ComHandler.handleMessage(message, connection);
    });

    //ask the client for detailed information
    connection.sendState(STATES.SETUP_REQ);
});

//configure handling of messages for the different states
function MessageHandling() {
    var config = [];

    //Handle connection setup
    config[STATES.SETUP] = function (msgObj, connection) {
        //update connection information
        connection.details.type = msgObj.type;
        console.log("Setup done:")
        connection.log(true);

        //send setup completion notice
        connection.sendState(STATES.SETUP_DONE);
    };

    //Client is asking for cam image
    config[STATES.IMG_REQ] = handleImgRequest;
    config[STATES.BINARY_START_REQ] = handleBinaryStart;
    config[STATES.BINARY] = handleBinaryData;
    config[STATES.BINARY_CLOSE] = handleBinaryClose;
    return config;
}

function handleImgRequest(msgObj, connection) {
    console.log("Image Request:");
    //validate the token
    if(msgObj.token && ServerSecurity.testToken(msgObj.token)){
        requestUpdatedImage();
    }else{
        //reject the request
        connection.sendState(STATES.IMG_REQ_REJECT);
    }
}

//prepare for receiving binary image data
function handleBinaryStart(data, connection) {
    var fStream = connection.details.stream;
    if (!fStream) {
        var path = connection.details.imgPath = "/private/"+data.fileName;
        fStream = connection.details.stream = fs.createWriteStream(__dirname + path);
    }
    connection.sendState(STATES.BINARY_START_ACK);
}
//retrieve image data
function handleBinaryData(data, connection) {
    var fStream = connection.details.stream;
    fStream.write(data);
}
//close the stream
function handleBinaryClose(data, connection) {
    var fStream = connection.details.stream;
    fStream.end();
    connection.details.stream = null;

    //send update to all browsers:
    var browsers = ConnectionHandler.getConnectionOfType(CONST.TYPES.BROWSER_CLIENT);
    if (browsers.length > 0) {
		for(var i in browsers)
        browsers[i].sendMessage({ imgPath: connection.details.imgPath }, CONST.STATES.NEW_IMAGE);
    }
}

//request a new image from the mobile client
var lastRequest = -1;
function  requestUpdatedImage(){
    var time = (new Date()).getTime();
    //allow updates only after the defined timeframe
    if(lastRequest<0 || lastRequest <= time - requestImageOnlyEachMs){
        lastRequest = time;
        var mobile = ConnectionHandler.getConnectionOfType(CONST.TYPES.CAM_CLIENT);
        if (mobile && mobile.length > 0) {
            console.log("Cam client with ID:%s found.", mobile[0].id);
            mobile[0].sendState(STATES.IMG_REQ);
        }
    }
}

function SSLServer(port) {
    //loadrequired modules
    var https = require('https');
    var fs = require('fs');

    //load ssl certificate
    var privateKey = fs.readFileSync('sslcert/key.pem', 'utf8');
    var certificate = fs.readFileSync('sslcert/cert.pem', 'utf8');
    var options = { key: privateKey, cert: certificate };

    //handle basic https requests
    function app(req, res) {
        var path = url.parse(req.url).pathname;
        handleHttp(req, res, path);
    }

    //create server
    var httpsServer = https.createServer(options, app);
    httpsServer.listen(port);

    //return the server
    return httpsServer;
}

//responds to different http requests
function handleHttp(req, res, path) {
        try {
        if (path == "/") {
            //index.html
            provideFile(req, res, '/public/index.html');
        }
        else if (path.indexOf("/public/") == 0) {
            //html/css/js from public folder
            provideFile(req, res, path);
        } else if (path == "/login" && req.method == 'POST') {
            //login
            ServerSecurity.Login(req, res);
        }
        else if (path == "/validateToken" && req.method == 'POST') {
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
            console.log(path);
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
        res.writeHead(200, { 'Content-Type': Common.MIME_TYPES.extractMimeType(path) });
        res.end(data);
    });
}

//Handles logins and security token operations
var ServerSecurity = (function () {
    //all valid logins
    var LOGINS = {
        "user": "pw",
        "test": "pw"
    };

    function setTokenCookie(res,token) {
        res.setHeader('Set-Cookie', CONST.TOKEN_HEADER + '=' + token );
    }

    //tests if the user is allowed to login
    function login(req, res) {
        var body = '';
        //read the data from the connection
        req.on('data', function (data) {
            body += data;
            // Too much POST data, kill the connection!
            if (body.length > 1e6)
                req.connection.destroy();
        });
        req.on('end', function () {
            //parse the received data
            var post = JSON.parse(body);
            if (post.user && LOGINS[post.user] == post.pw) {

                //create a new security token in case of a valid login
                var token = createToken(post.user);

                //set cookie value for the token
                setTokenCookie(res, token);
                res.writeHead(200);
                res.end("Granted");
            } else {
                //access denied due to invalid credentials
                res.writeHead(401);
                res.end("Denied");
            }
        });

    }

    //test if the token inside the header is valid
    function validateToken(req, res) {
        var validToken = testSecurityToken(req);
        if (validToken) {
            //return an updated version of the token
            var token = createToken(validToken.userName);
            setTokenCookie(res, token);
            return true;
        } else {
            return false;
        }
    }

    //creates a new security token
    function createToken(name) {
        //token is only valid for one server session
        var token = jwt.sign({ serverSessionID: serverSessionID, userName: name }, secret, { algorithm: CONST.TOKEN_ALGORITHM, expiresInMinutes: CONST.TOKEN_TIMEOUT });
        return token;
    }

    //tests the header of the request for a valid security token
    //allows passing in the token directly
    function testSecurityToken(req) {
        var token = null;
        if(typeof(req) === "object"){
            //get token from req
            token = parseCookies(req)[CONST.TOKEN_HEADER];        
        }else if(typeof(req) === "string"){
            //token was passed directly
            token = req;
        }
        if (token) {
            try {
                var decoded = jwt.verify(token, secret, { algorithm: CONST.TOKEN_ALGORITHM });
                if (decoded.serverSessionID == serverSessionID)
                    return decoded;
            } catch (err) { }
        }
        return null;
    }

    function parseCookies(request) {
        var list = {},
            rc = request.headers.cookie;

        rc && rc.split(';').forEach(function (cookie) {
            var parts = cookie.split('=');
            list[parts.shift().trim()] = decodeURI(parts.join('='));
        });
        return list;
    }

    return {
        Login: login,
        createToken: createToken,
        testToken: testSecurityToken,
        validateToken: validateToken
    }
})();