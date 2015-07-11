var CONST = require("../public/constants");
/** 
 * @constructor
 */
function Basesocket() {
    this.eventListeners = {};
    this.TYPE = "BaseSocket";
    this.ID = -1;
}

Basesocket.prototype = {
    /*
     * Allows registering of eventListers
     */
    on: function on(eventName, callback) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(callback);
    },
    /*
     *
     */
    receive: function receive(strMsg) {
        var msgObj = tryParseJSON(strMsg);
        if (typeof (msgObj) === "object") {
            if (msgObj.isParsedJSON) {
                //properly parsed JSON
                this._handleEvent(msgObj.ev, msgObj.pl);
            } else {
                //binary data
                this._handleEvent(CONST.STATES.BINARY, strMsg);
            }
        } else {
            console.error("String Message: %s", msgObj);
        }
    },
    /*
     * forwards the received payload and this connection wrapper based on the event
     */
    _handleEvent: function handleEvent(event, param) {
        console.log(event, this.ID, this.TYPE);

        var callbacks;
        var _event = event;

        //extract the functions arguments
        var args = arguments;
        Array.prototype.splice.call(args, 0, 1, this);

        //call all callbacks
        if ((callbacks = this.eventListeners[_event])) {
            callbacks.forEach(function (callback, i) {
                callback.apply(callback, args);
            });
        }
    },
    /*
     * send data to the other party.
     * can contain payload and or state information only
     */
    send: function send(data, eventName) {
        if (this.ws) {
            var transmit = {
                pl: data || {},
                ev: eventName || CONST.STATES.DEFAULT
            };
            var sdata = JSON.stringify(transmit);
            this.ws.send(sdata);
            return true;
        } else {
            return false;
        }
    },
    /*
     * setup the basic websocket events to forward them
     */
    _setupWebSocketEvents: function _setupWebSocketEvents() {
        console.log("eventListener setup", this.ID, this.TYPE);
        var self = this;
        var ws = this.ws;

        ws.on('message', function (message) {
            //messages will be parsed by the receive method and will forward events based on the received state
            self.receive(message);
        });

        ws.on("open", function () {
            self._handleEvent("connected");
        });

        ws.on("connection", function (ws_client) {
            self._handleEvent("connected", ws_client);
        });

        ws.on("pong", function () {
            self._handleEvent("pong");
        });

        ws.on("error", function (error) {
            self._handleEvent("error", error);
        });

        ws.on("close", function () {
            self._handleEvent("close");
        });
    }
};

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
module.exports = Basesocket;