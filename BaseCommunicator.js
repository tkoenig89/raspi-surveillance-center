var webSockets = require('ws');
var url = require('url');
var https = require('https');
var http = require('http');
var fs = require('fs');

var CONST = require("./public/constants");
var Basesocket = require("./modules/Basesocket");

/*
* Wrapper for Web Socket connections
* @constructor
*/
function Connection(ws){
    this.ws = ws;

    if(ws){
        this._setupWebSocketEvents();
    }
}
Connection.prototype = new Basesocket();


function Server(config){
    this.clients = [];
    this.httpServer = null;
    this.ws = null;

    var self = this;

    //ssl server to handle basic http(s) requests
    if(config.ssloptions){
        console.log("creating https server...");
        this.httpServer = https.createServer(config.ssloptions, _onHttp);    
    }else{
        console.log("creating http server...");
        this.httpServer = http.createServer(_onHttp);
    }
    this.httpServer.listen(config.port);
    console.log("listening on port %s",config.port);

    //wrap ssl server into websocket server
    this.ws = new webSockets.Server({ server: this.httpServer});  
    this._setupWebSocketEvents();

    //forward http requests
    function _onHttp(req,res){
        var path = url.parse(req.url).pathname;
        console.log("HTTP",req.method, path);
        
        //emit http event
        self._handleEvent("http",req,res,path);
    }
}
Server.prototype = new Basesocket();

/*
* adds the newly connected client to the list of clients connected to the server
*/ 
Server.prototype.addClient = function addClient(ws_client){
    console.log("adding new client");
    var clientConnection = new Connection(ws_client);
    this.clients.push(clientConnection);
    return clientConnection;
};

Server.prototype.removeClient = function removeClient(clientConnection){
    console.log("removing client");
    var idx = this.clients.indexOf(clientConnection);
    if(idx>=0){
        this.clients.splice(idx,1);
    }
};


/*
* Connects to a specific url using http or https websockets
*/
function _connect(url,secure){
    var ws;    
    if(secure){
        ws = new webSockets('wss://' + url, null, { rejectUnauthorized: false });
    }else{
        ws = new webSockets('ws://' + url);
    }
    var con = new Connection(ws);

    return con;
}

/*
* 
*/
function _server(port,keyFile,certFile){
    //load ssl certificate from file
    if(keyFile){
        var privateKey = fs.readFileSync(keyFile, 'utf8');
        var certificate = fs.readFileSync(certFile, 'utf8');
    }
    //create server
    var server = new Server({
        ssloptions: keyFile && { key: privateKey, cert: certificate },
        port: port
    });

    return server;
}

module.exports= {
    connect:_connect,
    server:_server
}