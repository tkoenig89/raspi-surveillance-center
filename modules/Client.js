var wSocket = require("ws"),
    Basesocket = require("./Basesocket"),
    Logger = require("./Logger");

/*
 * Wrapper for Web Socket connections
 * @constructor
 */
function ClientConnection(config) {
    if (config) {
        //overwrite base attributes
        this.eventListeners = {};
        this.TYPE = "ClientConnection";
        this.ID = config.ID || 0;
        
        //store connection information
        this.connection = {
            url: config.url,
            secure: config.secure
        };        
        
        this.connect();
    }
}
ClientConnection.prototype = new Basesocket();

ClientConnection.prototype.connect = function connect() {
    Logger.log(this);
    var url = this.connection.url;
    if (url) {
        if (this.connection.secure) {
            this.ws = new wSocket('wss://' + url, null, {
                rejectUnauthorized: false
            });
        } else {
            this.ws = new wSocket('ws://' + url);
        }
        
        //if successfull setup eventlisteners
        if (this.ws) {
            this._setupWebSocketEvents();
        }
    } else {
        Logger.err("Opening connection failed", this.connection.url);
    }
};

module.exports = ClientConnection;