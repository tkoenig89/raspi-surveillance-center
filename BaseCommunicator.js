var webSockets = require('ws');
var url = require('url');
var https = require('https');
var fs = require('fs');

var CONST = require("./public/constants");

function EventHandler(){
    this.eventListeners = {};    
}
EventHandler.prototype = {
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
    * forwards the received payload and this connection wrapper based on the event
    */
    handleEvent:function handleEvent(event,param){
        var callbacks;
        if((callbacks = this.eventListeners[event])){
            callbacks.forEach(function(callback,i){
                callback(Array.prototype.splice.call(arguments,0,1,this));
            },this);
        }            
    }
};

/*
* Wrapper for Web Socket connections
*/
function Connection(config){
    this.ws = config && config.ws || null;

    if(this.ws){
        //connect ws to the prototype logic
        this.ws.on('message', function(message) {
            this.receive(message);
        });
    }
}
Connection.prototype = new EventHandler();
Connection.prototype.receive = function receive(strMsg){
    var msgObj = tryParseJSON(strMsg);
    if (typeof (msgObj) === "object") {
        if(msgObj.isParsedJSON){
            //properly parsed JSON
            this.handleEvent(msgObj.ev, msgObj.pl);
        }else{
            //binary data
            this.handleEvent(CONST.STATES.BINARY, strMsg);
        }
    } else{
        console.error("String Message: %s", msgObj);
    }
};
/*
* send data to the other party.
* can contain payload and or state information only
*/
Connection.prototype.send = function send(data,eventName){
    var transmit = {
        pl: data || {},
        ev: eventName || CONST.STATES.DEFAULT
    }
    var sdata = JSON.stringify(transmit);
    this.ws.send(sdata);
};

function Server(config){    
    //ssl server to handle basic http(s) requests
    this.httpsServer = https.createServer(config.options, function onHttp(req,res){
        var path = url.parse(req.url).pathname;
        //emit http event
        this.handleEvent("http",req,res,path);
    });    
    this.httpsServer.listen(config.port);

    //wrap ssl server into websocket server
    this.wss = new webSockets.Server({ server: this.httpsServer});    
}
Server.prototype = new Connection();


/*
* Utility method for json parsing
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
    var con = new Connection({
        ws: secure? new webSockets('wss://' + url, null, { rejectUnauthorized: false }): new webSockets('ws://'+url)
    });

    return con;
}

/*
* 
*/
function _server(port,keyFile,certFile){
    //load ssl certificate from file
    var privateKey = fs.readFileSync(keyFile, 'utf8');
    var certificate = fs.readFileSync(certFile, 'utf8');

    //create server
    var server = new Server({
        options: { key: privateKey, cert: certificate },
        port: port
    });

    return server;
}

module.exports= {
    connect:_connect,
    server:_server
}