var BaseSocket = require("./BaseSocket"),
    CONSTANTS = require("../public/constants"),
    STATES = CONSTANTS.STATES,
    Logger = require("./Logger"),
    ServerSecurity = require("./Security.js"),
    fs = require("fs");

/*
 * Handles all the communication between server and client
 * @constructor
 *
 */
function ClientStub(config) {
    try {
        this.ID = config.ID;
        this.eventListeners = {};
        this.ws = config.ws;
        this.server = config.server;
        this.binary = {
            stream: null,
            imgPath: null,
            imgName: null,
        };

        //configure the internal eventhandlers
        this._setupWebSocketEvents();
        this.setupCommuncationHandling();

        //send initial setup request
        this.sendEventOnly(STATES.SETUP_REQ);
    } catch (exception) {
        Logger.err("ClientStub creation:", exception.message);
    }
}

ClientStub.prototype = new BaseSocket();

ClientStub.prototype.setupCommuncationHandling = function setup() {
    this.on(STATES.SETUP, handleSetup);
    this.on(STATES.CONNECTION_CLOSED, handleClose);
    this.on(STATES.BINARY_START_REQ, handleBinaryStart);
    this.on(STATES.BINARY, handleBinaryData);
    this.on(STATES.BINARY_CLOSE, handleBinaryClose);
    this.on(STATES.IMG_REQ_ALL_CAMS, handleCamListRequest);
    this.on(STATES.IMG_REQ_ONE_CAMS, handleCamUpdateRequest);
}

function handleClose(client) {
    //todo: remove event listers!
    client.server.removeClient(client);

    //remove the image from hdd
    broadcastImageUpdate(client, true);
    client.server.ImageWrapper.RemoveCam(client.ID);
    client = null;
}

function handleSetup(client, data) {
    //update connection information
    client.TYPE = data.type;

    //try to find a open connection to this client and close the old connection
    var oldConnection = client.server.findClientById(data.ID);
    Logger.log("Old ID:", data.ID);
    if (oldConnection) {
        Logger.log("Closing old connection");
        oldConnection.ws.close();
        handleClose(client);
    }

    //send setup completion notice
    //client.sendEventOnly(STATES.SETUP_DONE);
    client.send({
        ID: client.ID
    }, STATES.SETUP_DONE);

    Logger.log("Setup done!", client.ID, CONSTANTS.TYPES[client.TYPE]);
}

//prepare for receiving binary image data
function handleBinaryStart(client, data) {
    var fStream = client.binary.stream;
    if (!fStream) {
        var binary = client.binary;
        binary.imgPath = "/private/";
        binary.imgName = client.ID + "_" + data.fileName;
        var path = binary.imgPath + binary.imgName;
        Logger.debug(__dirname);
        fStream = binary.stream = fs.createWriteStream(__dirname + "/.." + path);
    }
    client.sendEventOnly(STATES.BINARY_START_ACK);
}

//retrieve image data
function handleBinaryData(client, data) {
    Logger.debug("Binary", data);
    var fStream = client.binary.stream;
    fStream.write(data);
}

//close the stream
function handleBinaryClose(client, data) {
    var fStream = client.binary.stream;
    if (fStream) fStream.end();
    var binary = client.binary;
    binary.stream = null;

    var imgWrapper = client.server.ImageWrapper;
    imgWrapper.SetCam(client.ID, binary.imgPath + binary.imgName);

    //notify the browsers
    broadcastImageUpdate(client);
}

function handleCamListRequest(client, data) {
    if (ServerSecurity.TestToken(data.token, "Admin,Read,View")) {
        Logger.debug(client.ID, "Requesting camera list");

        var camList = client.server.ImageWrapper.GetAllCams();
        Logger.debug("Cameralist:", camList);

        client.send(camList, STATES.IMG_SEND_ALL_CAMS);
    } else {
        Logger.log("unauthorized request");
    }
}

function handleCamUpdateRequest(client, data) {
    if (ServerSecurity.TestToken(data.token, "Admin,Read,View")) {
        Logger.debug(client.ID, "Requesting camera update for", data.ID);
        if (data.ID) {
            var camera = client.server.findClientById(data.ID);
            if (camera) {
                camera.sendEventOnly(STATES.IMG_REQ);
            }
        }
    } else {
        Logger.log("unauthorized request");
    }
}

/**
 * Will send a message to all opened browsers, with the new image
 * @param {object} client
 */
function broadcastImageUpdate(client, removed) {
    //send update to all browsers:
    var stateToSend = removed ? CONSTANTS.STATES.REMOVED_IMAGE : CONSTANTS.STATES.NEW_IMAGE;
    var imgWrapper = client.server.ImageWrapper;
    var browsers = client.server.getClientsByType(CONSTANTS.TYPES.BROWSER_CLIENT);
    if (browsers.length > 0) {
        for (var i in browsers)
            browsers[i].send(imgWrapper.GetCam(client.ID), stateToSend);
    }
}

module.exports = ClientStub;