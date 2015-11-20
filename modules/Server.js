var fs = require("fs"),
    http = require("http"),
    https = require("https"),
    url = require('url'),
    wSocket = require("ws"),
    Basesocket = require("./BaseSocket"),
    Client = require("./Client"),
    Logger = require("./Logger");

function Server(config) {
    //overwrite base attributes
    this.eventListeners = {};
    this.TYPE = "Server";
    this.ID = this.idTracker();

    this.clients = [];
    this.httpServer = null;
    this.SessionID = config.sessionID;
    this.ws = null;
    var self = this;

    //load ssl certificate from file
    var secureConfig = null;
    if (config.keyFile && config.certFile) {
        var privateKey = fs.readFileSync(config.keyFile, 'utf8');
        var certificate = fs.readFileSync(config.certFile, 'utf8');
        secureConfig = {
            key: privateKey,
            cert: certificate
        };
    }

    //create either an https or http server
    if (secureConfig) {
        Logger.log("Creating https server...");
        this.httpServer = https.createServer(secureConfig, _onHttp);
    } else {
        Logger.log("Creating http server...");
        this.httpServer = http.createServer(_onHttp);
    }
    //listen on the configured port
    this.httpServer.listen(config.port);
    Logger.log("Listening on port", config.port);

    //wrap ssl server into websocket server
    this.ws = new wSocket.Server({
        server: this.httpServer
    });
    this._setupWebSocketEvents();

    //forward http requests
    function _onHttp(req, res) {
        var path = url.parse(req.url).pathname;
        Logger.debug("HTTP", req.method, path);

        //emit http event
        self._handleEvent("http", req, res, path);
    }
}
Server.prototype = new Basesocket();

/*
 * adds the newly connected client to the list of clients connected to the server
 */
Server.prototype.addClient = function addClient(ws_client) {
    Logger.log("adding new client");
    var clientConnection = new Client({
        ws: ws_client,
        ID: this.idTracker()
    });
    this.clients.push(clientConnection);
    return clientConnection;
};
Server.prototype.idTracker = (function () {
    //client id is based on the server session
    var _id = 1;
    return function () {
        return (this.SessionID + (_id++));
    };
})();
/*
 * This will return a client connection with the given id.
 */
Server.prototype.findClientById = function findClientById(id) {
    var len = this.clients.length;
    for (var i = 0; i < len; i++) {
        var cl = this.clients[i];
        if (cl.ID === id) {
            return cl;
        }
    }
}
Server.prototype.removeClient = function removeClient(clientConnection) {
    Logger.log("removing client");
    var idx = this.clients.indexOf(clientConnection);
    if (idx >= 0) {
        this.clients.splice(idx, 1);
    }
};

Server.prototype.getClientsByType = function getClientsByType(type) {
    var found = [];
    this.clients.forEach(function (cl, i) {
        if (cl.TYPE == type) {
            found.push(cl);
        }
    });
    return found;
};

module.exports = Server;