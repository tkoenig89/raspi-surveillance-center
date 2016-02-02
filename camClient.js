var Client = require("./modules/Client"),
    CONSTANTS = require("./public/constants"),
    CONFIG = require("./config.js"),
    Logger = require("./modules/Logger"),
    STATES = CONSTANTS.STATES,
    TYPES = CONSTANTS.TYPES,
    fs = require("fs");

var cam_client = (function () {
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
    client.on(STATES.ERROR, handleError);
    client.on(STATES.CONNECTION_CLOSED, handleClose);
    client.on(STATES.BINARY_START_ACK, sendImage);

    function handleSetupRequest(client) {
        try {
            client.send({
                type: TYPES.CAM_CLIENT,
                ID: client.ID || -1,
                Name: CONFIG.CLIENT.NAME
            }, STATES.SETUP);
        } catch (ex) {
            Logger.err("Error handling setup request", ex);
        }
    }

    function handleSetupDone(client, data) {
        client.ID = data.ID;
        Logger.log("Connection established");

        //send image when setup is done
        handleImgRequest(client);
    }

    function handleClose(client) {
        client.reconnect();
    }

    function handleError(client, error) {
        Logger.err(error);

        //try to reconnect
        client.reconnect();
    }

    function handleImgRequest(client, data) {
        try {
            Logger.debug("Img request");
            //get the latest image
            var fileName = getLatestImage(client);
            //and prepare server for sending if binary data
            client.send({
                fileName: fileName
            }, STATES.BINARY_START_REQ);
        } catch (ex) {
            Logger.err("Error handling image request", ex);
        }
    }

    function getLatestImage(client) {
        //remember path to the file and return its name
        client.binary = {
            filePath: CONFIG.CLIENT.CLIENT_IMG_FOLDER + "/" + CONFIG.CLIENT.CLIENT_IMG_FILENAME,
            fileFromDir: CONFIG.CLIENT.CLIENT_USE_PRJFOLDER
        };
        return client.binary.filePath.match(/\w+\.\w+$/)[0];
    }

    function sendImage(client) {
        var readStream = fs.createReadStream((client.binary.fileFromDir ? __dirname : "") + client.binary.filePath);
        Logger.debug("start", client.binary.fileFromDir, client.binary.filePath);

        readStream.on('data', function (data) {
            Logger.debug("data", data);
            client.ws.send(data, {
                binary: true,
                mask: true
            });
        });
        readStream.on("end", function (data) {
            Logger.debug("end", data);
            client.sendEventOnly(STATES.BINARY_CLOSE);
        });
    }
})();