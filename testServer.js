var com = require("./BaseCommunicator.js");
var CONSTANTS = require("./public/constants.js");
var ServerSecurity = require("./Security.js");
var fs = require('fs');
var t = com.server(8080);

t.on("http",function(server,req,res,path){
    handleHttp(req,res,path);
});

t.on("connected",function(server,ws){
    console.log("client connected");
    var client = t.addClient(ws);
    
    client.on("tmsg",function(server,data){
        console.log("msg",data);    
    }); 
    
    client.on("close",function(){
        //todo: remove event listers!
        t.removeClient(client);
    });
    
    client.send(null,"tmsg");
});

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
        res.writeHead(200, { 'Content-Type': CONSTANTS.MIME_TYPES.extractMimeType(path) });
        res.end(data);
    });
}