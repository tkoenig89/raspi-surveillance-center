var BaseSocket = require("./BaseSocket"),
    CONSTANTS = require("../public/constants"),
    CONFIG = require("../config.js"),
    STATES = CONSTANTS.STATES,
    Logger = require("./Logger"),
    fs = require("fs");

/*
 * Handles all the communication between server and client
 * @constructor
 *
 */
function ClientStub(config) {
    try {
        this.ID = -2;
        this.Name = "";
        this.eventListeners = {};
        this.ws = config.ws;
        this.server = config.server;
        this.binary = {
            stream: null,
            imgPath: null,
            imgName: null
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
    this.on(STATES.REQUEST_ARCHIVED_IMAGES, handleArchiveRequest);
}

function handleClose(client) {
    //todo: remove event listers!
    client.server.removeClient(client);

    //remove the image from hdd
    client.server.ImageWrapper.DeaktivateCam(client.Name);
    client.server.NotifyAllBrowserClients(client.Name, true);
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

    //set client id & name
    client.ID = client.server.idTracker(data.ID);
    client.Name = data.Name || client.ID;
    Logger.debug("Client Name:", client.Name);

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
        binary.imgName = client.Name + "_" + data.fileName;
        var path = binary.imgPath + binary.imgName;

        var prjDir = client.server.GetProjektFolder();

        fStream = binary.stream = fs.createWriteStream(prjDir + path);
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

    client.server.AddOrUpdateImage(client.Name, client.ID, binary.imgPath + binary.imgName);
}

function handleCamListRequest(client, data) {
    Logger.debug(client.ID, "Requesting camera list");

    var camList = client.server.GetAllCameras(data.token);
    if (camList) {
        client.send(camList, STATES.IMG_SEND_ALL_CAMS);
    }
}

function handleCamUpdateRequest(client, data) {
    Logger.debug(client.ID, "Requesting camera update for", data.ID);
    client.server.ImageUpdateRequest(data.token, data.ID);
}

function handleArchiveRequest(client, data) {
    var folderList = client.server.GetArchivedImages(data.token);
    if (folderList) {
        client.send(folderList, STATES.PROVIDE_ARCHIVED_IMAGES);
    }
}

module.exports = ClientStub;