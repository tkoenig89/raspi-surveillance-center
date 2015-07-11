var wSocket = require("ws"),
    Basesocket = require("./Basesocket");
/*
 * Wrapper for Web Socket connections
 * @constructor
 */
function ClientConnection(config) {
    //overwrite base attributes
    this.eventListeners = {};
    this.TYPE = "ClientConnection";
    this.ID = config.ID || 0;

    //set websocket either from config or create a new from url
    if (config.ws) {
        this.ws = config.ws;
    } else if (config.url) {
        if (config.secure) {
            this.ws = new wSocket('wss://' + config.url, null, {
                rejectUnauthorized: false
            });
        } else {
            this.ws = new wSocket('ws://' + config.url);
        }
    }

    //if websocket is set, register the eventhandlers
    if (this.ws) {
        this._setupWebSocketEvents();
    }
}
ClientConnection.prototype = new Basesocket();

module.exports = ClientConnection;