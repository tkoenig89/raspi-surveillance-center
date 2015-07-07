var webSockets = require('ws');
var url = require('url');
var https = require('https');
var http = require('http');
var fs = require('fs');

var CONST = require("./public/constants");

/** 
* @constructor
*/
function Basesocket(ws){
    this.eventListeners = {};
    this.ws = ws || null;
}
Basesocket.prototype = {
    /*
    * Allows registering of eventListers
    */
    on:function on(eventName,callback){
        if(!this.eventListeners[eventName]){
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(callback);
    },
    /*
    * 
    */
    receive: function receive(strMsg){
        var msgObj = tryParseJSON(strMsg);
        if (typeof (msgObj) === "object") {
            if(msgObj.isParsedJSON){
                //properly parsed JSON
                this._handleEvent(msgObj.ev, msgObj.pl);
            }else{
                //binary data
                this._handleEvent(CONST.STATES.BINARY, strMsg);
            }
        } else{
            console.error("String Message: %s", msgObj);
        }
    },
    /*
    * forwards the received payload and this connection wrapper based on the event
    */
    _handleEvent:function handleEvent(event,param){
        var callbacks;
        var _event = event;

        //extract the functions arguments
        var args = arguments;
        Array.prototype.splice.call(args,0,1,this);

        //call all callbacks
        if((callbacks = this.eventListeners[_event])){
            callbacks.forEach(function(callback,i){
                callback.apply(callback,args);
            });
        }            
    },
    /*
    * send data to the other party.
    * can contain payload and or state information only
    */
    send: function send(data,eventName){
        if(this.ws){
            var transmit = {
                pl: data || {},
                ev: eventName || CONST.STATES.DEFAULT
            };
            var sdata = JSON.stringify(transmit);
            this.ws.send(sdata);
            return true;
        }else{
            return false;
        }
    },
    /*
    * setup the basic websocket events to forward them
    */
    _setupWebSocketEvents:function _setupWebSocketEvents(){
        var self = this;
        var ws = this.ws;
        ws.on('message', function(message) {
            self.receive(message);
        });

        ws.on("open",function(){
            self._handleEvent("connected");
        });
        
        ws.on("connection",function(ws_client){
            self._handleEvent("connected",ws_client);
        })
    } 
};

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
        console.log("http incoming");
        var path = url.parse(req.url).pathname;
        //emit http event
        self._handleEvent("http",req,res,path);
    }
}
Server.prototype = new Basesocket();
Server.prototype.addClient = function addClient(ws_client){
    console.log("adding new client");
    var clientConnection = new Connection(ws_client);
    this.clients.push(clientConnection);
    return clientConnection;
}

/** 
* Description 
* @param {string} str textvalue to parse to json 
*/
function tryParseJSON(str) {
    var obj = null;
    try {
        obj = JSON.parse(str);
        obj.isParsedJSON = true;
    } catch (ex) {
        obj = str;
    }
    return obj;
}

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