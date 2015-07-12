var wSocket = require("ws"),
    CONST = require("../public/constants"),
    STATES = CONST.STATES,
    Basesocket = require("./Basesocket"),
    Logger = require("./Logger");

var retryAfterSecs = 5000;

/*
 * Wrapper for Web Socket connections
 * @constructor
 */
function ClientConnection(config) {
    if (config) {
        //overwrite base attributes
        this.TYPE = "ClientConnection";
        this.ID = config.ID || 0;

        //store connection information
        this.connection = {
            url: config.url,
            secure: config.secure,
            attemps: 0,
            retryTime: retryAfterSecs
        };

        this.connect();
    }
}
ClientConnection.prototype = new Basesocket();

ClientConnection.prototype.connect = function connect(isReconnect) {
    var url = this.connection.url;
    if (url) {
        Logger.log("Connectiong to", url);
        if (this.connection.secure) {
            this.ws = new wSocket('wss://' + url, null, {
                rejectUnauthorized: false
            });
        } else {
            this.ws = new wSocket('ws://' + url);
        }

        //if successfull, setup eventlisteners
        if (this.ws) {
            if (!isReconnect) {
                this.on(STATES.CONNECTION_OPENED, function (client) {
                    client.connection.attemps = 0;
                    client.connection.retryTime = retryAfterSecs;
                });
            }

            //map ws events to eventlisterns of the client
            this._setupWebSocketEvents();
        }
    } else {
        Logger.err("Opening connection failed", this.connection.url);
    }
};

ClientConnection.prototype.reconnect = function reconnect() {
    this.ws = null;
    this.sendPing = false;

    //double the waiting time if there has been no answer twice
    if (this.connection.attemps >= 2) {
        this.connection.retryTime *= 2;
        this.connection.attemps = 1;
    } else {
        this.connection.attemps++;
    }

    Logger.log("Reconnecting in", this.connection.retryTime / 1000);
    var self = this;
    setTimeout(function () {
        self.connect(true);
    }, this.connection.retryTime);
};

/*
 * Starts pinging the server regular
 */
ClientConnection.prototype.pingServer = function pingServer() {
    this.sendPing = true;
    this._pingsent = 0;
    _pingServer(this);
};

//pings the server every 5 minutes to keep connection open
function _pingServer(client) {
    if (client.sendPing) {
        setTimeout(doThePing, 360000); //=> 5 min 360000
    }

    function doThePing() {
        client.ping();
        client._pingsent++;

        //start another ping after a while
        _pingServer(client);
    }
}
module.exports = ClientConnection;