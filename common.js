var CONST = require("./public/constants.js");
var Common = {
    MIME_TYPES: {
        js: "application/javascript",
        html: "text/html",
        css: "text/css",
        extractMimeType: function (path) {
            if (path) {
                var fExt = path.match(/\.\w+$/);
                if (fExt.length == 1) {
                    return this[fExt[0].substr(1)];
                }
            }
            return null;
        }
    },

    ConnectionHandler: (function () {
        var _idCounter = 0;
        var _connections = [];

        //add a connection
        function addConnection(webSocket) {
            var connection = new Connection(webSocket);

            _connections.push(connection);

            console.log("New connection (ID:%s)", connection.id);

            //handle closing of this request 
            webSocket.on("close", function () {
                removeConnection(connection);
            });

            return connection
        }

        //remove a connection
        function removeConnection(connection) {
            var idx = _connections.indexOf(connection);
            _connections.splice(idx, 1);

            console.log("Connection (ID:%s) disconnected", connection.id);
        }

        function Connection(webSocket) {
            this.details = {
                type: -1,
                state: CONST.STATES.SETUP
            };
            this.webSocket = webSocket;
            this.id = _idCounter++;
        }
        Connection.prototype = {
            log: function (all) {
                console.log("ID:%s", this.id);
                if (all) {
                    console.log(this.details);
                }
            },
            sendMessage: function (data, state) {
                Common.CommunicationHandler.sendMessage(this, data, state);
            },
            sendState: function (state) {
                this.details.state = state;
                Common.CommunicationHandler.sendMessage(this, null, state);
            }
        };
        //returns all mobile connections currently registered
        function getConnectionOfType(type) {
            var cons = [];

            for (var i in _connections) {
                var con = _connections[i];
                if (con.details && con.details.type === type) {
                    cons.push(con);
                }
            }
            return cons;
        }

        //public functions
        return {
            add: addConnection,
            remove: removeConnection,
            getConnectionOfType: getConnectionOfType
        }
    })(),

    CommunicationHandler: (function () {
        var handling = null;
        function configureMessageHandling(config) {
            handling = config;
        }

        function handleMessage(message, connection) {
            var msgObj = tryParseJSON(message);
            if (typeof (msgObj) === "object") {
                if(msgObj.isParsedJSON){
                    //properly parsed JSON
                    handleCommunication(msgObj, connection);
                }else{
                    //binary data
                    handling[CONST.STATES.BINARY](message, connection);
                }
            } else{
                //console.log("String Message: %s", msgObj);
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

        function handleCommunication(msgObj, connection) {
            for (var state in handling) {
                if (state == msgObj.state) {
                    handling[state](msgObj, connection);
                    break;
                }
            }
        }

        //Send message to target connection
        function sendMessage(connection, data, state) {
            if (!data) {
                data = {};
            }
            if (state === 0 || state) {
                data.state = state;
            } if (data.state !== 0 && !data.state) {
                data.state = CONST.STATES.DEFAULT;
            }
            var sdata = JSON.stringify(data);
            connection.webSocket.send(sdata);
        }

        return {
            handleMessage: handleMessage,
            configure: configureMessageHandling,
            sendMessage: sendMessage
        }
    })(),
}

module.exports = {
    MIME_TYPES: Common.MIME_TYPES,
    ConnectionHandler: Common.ConnectionHandler,
    CommunicationHandler: Common.CommunicationHandler
};