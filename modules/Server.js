var fs = require("fs"),
    http = require("http"),
    https = require("https"),
    url = require('url'),
    wSocket = require("ws"),
    Basesocket = require("./Basesocket"),
    Client = require("./Client");

function Server(config) {
    this.clients = [];
    this.httpServer = null;
    this.ws = null;
    this.TYPE = "Server";
    this.ID = this.idTracker();
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
        console.log("creating https server...");
        this.httpServer = https.createServer(secureConfig, _onHttp);
    } else {
        console.log("creating http server...");
        this.httpServer = http.createServer(_onHttp);
    }
    //listen on the configured port
    this.httpServer.listen(config.port);
    console.log("listening on port %s", config.port);

    //wrap ssl server into websocket server
    this.ws = new wSocket.Server({
        server: this.httpServer
    });
    this._setupWebSocketEvents();

    //forward http requests
    function _onHttp(req, res) {
        var path = url.parse(req.url).pathname;
        console.log("HTTP", req.method, path);

        //emit http event
        self._handleEvent("http", req, res, path);
    }
}
Server.prototype = new Basesocket();

/*
 * adds the newly connected client to the list of clients connected to the server
 */
Server.prototype.addClient = function addClient(ws_client) {
    console.log("adding new client");
    var clientConnection = new Client({
        ws: ws_client,
        ID: this.idTracker()
    });
    this.clients.push(clientConnection);
    return clientConnection;
};
Server.prototype.idTracker = (function () {
    var _id = 0;
    return function () {
        return _id++;
    };
})();

Server.prototype.removeClient = function removeClient(clientConnection) {
    console.log("removing client");
    var idx = this.clients.indexOf(clientConnection);
    if (idx >= 0) {
        this.clients.splice(idx, 1);
    }
};

module.exports = Server;