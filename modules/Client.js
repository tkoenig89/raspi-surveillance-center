var wSocket = require("ws"),
    CONST = require("../public/constants"),
    STATES = CONST.STATES,
    Basesocket = require("./BaseSocket"),
    Logger = require("./Logger");

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
            retryTime: 5000,
            retryMax: 60000
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
                var self = this;
                this.on(STATES.CONNECTION_OPENED, function (client) {
                    //reset reconnect values on successful connect
                    client._pingsent = 0;
                    client.connection.attemps = 0;
                    client.connection.retryTime = 5000;
                });
                this.on(STATES.PONG, function (server) {
                    //reset pingcount after successful pong
                    Logger.debug("pong");
                    self._pingsent = 0;
                });

            }
            handlePingPong(this);

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
    if (this.connection.attemps >= 2 && this.connection.retryTime <= this.connection.retryMax) {
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
/**
 * handles ping pong between client and the server. Starts reconnect after 2 failed pings
 */
function handlePingPong(client) {
    Logger.debug("Setup ping-pong");
    var pingTimeout = CONST.TIME_BETWEEN_PINGS * 1000;
    client.sendPing = true;
    client._pingsent = 0;

    //start pinging
    _pingServer();

    function _pingServer() {
        if (client.sendPing) {
            if (client._pingsent < 3) {
                setTimeout(doThePing, pingTimeout);
            } else {
                // connection seems to be lost
                Logger.debug("Connection lost", client._pingsent);
                client.reconnect();
            }

        }

        function doThePing() {
            if (client.sendPing) {
                client.ping();
                client._pingsent++;

                Logger.debug("ping");
                //start another ping after a while
                _pingServer(client);
            }
        }
    }
}

module.exports = ClientConnection;