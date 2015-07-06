var webSockets = require('ws');
var CONST = require("public/constants");

/*
* Wrapper for Web Socket connections
*/
function Connection(config){
    this.eventListeners = {};
    this.ws = config.ws || null;
}

Connection.prototype = {
    on:function on(eventName,callback){
        var listeners = this.eventListeners[eventName] || (this.eventListeners[eventName] = {});
        listeners.push(callback);
    },
    receive:function receive(strMsg){
        var msgObj = tryParseJSON(strMsg);
        if (typeof (msgObj) === "object") {
            if(msgObj.isParsedJSON){
                //properly parsed JSON
                handleEvent(msgObj.event, connection);
            }else{
                //binary data
                handling[CONST.STATES.BINARY](message, connection);
            }
        } else{
            console.error("String Message: %s", msgObj);
        }
        
        var event = params.event;    

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
    * can contain payload and or only
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
* 
*/
function _connect(url){
    var con = new Connection({
        ws: new WebSocket('wss://' + url, null, { rejectUnauthorized: false })
    });


    return con;
}
exports= {
    connect:_connect,
    server:_server
}