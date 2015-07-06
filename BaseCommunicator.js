var webSockets = require('ws');
var CONST = require("public/constants");

/*
* Wrapper for Web Socket connections
*/
function Connection(config){
    this.eventListeners = {};
    this.ws = config.ws || null;

    //connect ws to the prototype logic
    this.ws.on('message', function(message) {
        this.receive(message);
    });
}

Connection.prototype = {
    /*
    * Allows registering of eventListers
    */
    on:function on(eventName,callback){
        var listeners = this.eventListeners[eventName] || (this.eventListeners[eventName] = {});
        listeners.push(callback);
    },
    
    /*
    * handles receiving of messages and forwarding to provided eventListeners
    */
    receive:function receive(strMsg){
        var msgObj = tryParseJSON(strMsg);
        if (typeof (msgObj) === "object") {
            if(msgObj.isParsedJSON){
                //properly parsed JSON
                handleEvent(msgObj.ev, msgObj.pl);
            }else{
                //binary data
                handleEvent(CONST.STATES.BINARY, strMsg);
            }
        } else{
            console.error("String Message: %s", msgObj);
        }

        /*
        * forwards the received payload and this connection wrapper based on the event
        */
        function handleEvent(event,payload){
            var callbacks;
            if((callbacks = this.eventListeners[eventName])){
                callbacks.forEach(function(callback,i){
                    callback(payload,this);
                },this);
            }            
        }
    },    
    /*
    * send data to the other party.
    * can contain payload and or state information only
    */
    send:function send(data,eventName){
        var transmit = {
            pl: data || {},
            ev: eventName || CONST.STATES.DEFAULT
        }
        var sdata = JSON.stringify(transmit);
        this.ws.send(sdata);
    }
}

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
        ws: secure? new WebSocket('wss://' + url, null, { rejectUnauthorized: false }): new WebSocket('ws://'+url)
    });

    return con;
}
exports= {
    connect:_connect,
    server:_server
}