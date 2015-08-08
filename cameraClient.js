var Client = require("./modules/Client"),
    CONSTANTS = require("./public/constants"),
    Logger = require("./modules/Logger"),
    STATES = CONSTANTS.STATES,
    TYPES = CONSTANTS.TYPES,
    fs = require("fs");

var cam_client = (function () {
    var _pingsent = 0;
    var client = new Client({
        url: CONSTANTS.SERVICE_URL + ":" + CONSTANTS.SERVICE_PORT,
		secure: CONSTANTS.SECURE_CONNECTION
    });

    client.on(STATES.CONNECTION_OPENED, function () {

    });

    //register these events in general. not for each connection!
    //client will internally map the events for each new connection it needs to open
    client.on(STATES.SETUP_REQ, handleSetupRequest);
    client.on(STATES.SETUP_DONE, handleSetupDone);
    client.on(STATES.IMG_REQ, handleImgRequest);
    client.on(STATES.PONG, handlePong);
    client.on(STATES.ERROR, handleError);
    client.on(STATES.CONNECTION_CLOSED, handleClose);
    client.on(STATES.BINARY_START_ACK, sendImage);

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

    function handleImgRequest(client, data) {
        Logger.log("img request arived");
        //get the latest image
        var fileName = getLatestImage(client);
        //and prepare server for sending if binary data
        client.send({
            fileName: fileName
        }, STATES.BINARY_START_REQ);
    }

    function getLatestImage(client) {
        //remember path to the file and return its name
        client.binary = {
            filePath: "/imgs/small.jpg",
            fileFromDir: true
        };
        return client.binary.filePath.match(/\w+\.\w+$/)[0];
    }

    function sendImage(client) {
        var readStream = fs.createReadStream((client.binary.fileFromDir ? __dirname : "") + client.binary.filePath);
            Logger.log("start",client.binary.fileFromDir,client.binary.filePath);

        readStream.on('data', function (data) {
            Logger.log("data",data);
            client.ws.send(data, {
                binary: true,
                mask: true
            });
        });
        readStream.on("end", function (data) {
            Logger.log("end",data);
            client.sendEventOnly(STATES.BINARY_CLOSE);
        });
    }
})();
