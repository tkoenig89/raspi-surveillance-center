var Client = require("./modules/Client"),
    CONSTANTS = require("./public/constants"),
    Logger = require("./modules/Logger"),
    STATES = CONSTANTS.STATES,
    TYPES = CONSTANTS.TYPES;
var _pingsent = 0;
var client = new Client({
    url: "localhost:8080"
});

client.on(STATES.CONNECTION_OPENED, function () {
    client.on(STATES.SETUP_REQ, handleSetupRequest);
    client.on(STATES.SETUP_DONE, handleSetupDone);
    client.on(STATES.PONG, handlePong);
});

client.on(STATES.ERROR, handleError);
client.on(STATES.CONNECTION_CLOSED, handleClose);

function handleSetupRequest(client) {
    client.send({
        type: TYPES.CAM_CLIENT
    }, STATES.SETUP);
}

function handleSetupDone(client) {
    Logger.log("starting to ping server");
    client.pingServer();
}

function handleClose(client) {
    client.reconnect();
}

function handleError(client, error) {
    Logger.err(error);

    //try to reconnect
    client.reconnect();
}

function handlePong(client) {
    Logger.log("Pong after " + client._pingsent + " pings");
    client._pingsent = 0;
}