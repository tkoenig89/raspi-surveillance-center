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

});

client.on(STATES.SETUP_REQ, handleSetupRequest);
client.on(STATES.SETUP_DONE, handleSetupDone);
client.on(STATES.ERROR, handleError);
client.on(STATES.PONG, handlePong);

function handleSetupRequest(client) {
    client.send({
        type: TYPES.CAM_CLIENT
    }, STATES.SETUP);
}

function handleSetupDone(client) {
    Logger.log("starting to ping server");
    sendPing = true;
    pingServer(client);
}

function handleError(client, error) {
    Logger.error(error);
}

function handlePong() {
    Logger.log("Pong after " + _pingsent + " pings");
    _pingsent = 0;
}

//pings the server every 5 minutes to keep connection open
function pingServer(client) {
    if (sendPing) {
        setTimeout(doThePing, 360000); //=> 5 min 360000
    }

    function doThePing() {
        client.ping();
        _pingsent++;

        //start another ping after a while
        pingServer(client);
    }
}