var CONST = require("./public/constants")
var Common = require("./common");
var STATES = CONST.STATES;
var TYPES = CONST.TYPES;
var ComHandler = Common.CommunicationHandler;
var ConnectionHandler = Common.ConnectionHandler;

var connection = null;
var _pingsent = 0;
var fs = require("fs");
var ws = null;
var sendPing = false;

ComHandler.configure(MessageHandling());

function connectToServer(){	
	try{
		var WebSocket = require('ws');
		//ws = new WebSocket('wss://localhost:8080/', null, { rejectUnauthorized: false });
		ws = new WebSocket('wss://' + CONST.SERVICE_URL, null, { rejectUnauthorized: false });

		ws.on('open', function() {
			connection = ConnectionHandler.add(ws);	
		});
		 
		ws.on('message', function(message) {
			ComHandler.handleMessage(message,connection);
		});

		ws.on("pong",function(data,flags){
			console.log("pong after %s pings",_pingsent);
			_pingsent = 0;
		});
		
		ws.on("error",function(error){
			reconectWithTimeout();			
		});
		
		ws.on("close", function () {
			reconectWithTimeout();
		});
	}catch(ex){
		reconectWithTimeout();
	}
	
	function reconectWithTimeout(){
		ws = null;
		sendPing = false;
		console.log("reconnecting in 15 seconds...");
		setTimeout(connectToServer,15000);
	}
}
connectToServer();

//pings the server every 5 minutes to keep connection open
function pingServer(){
	if(sendPing){
		setTimeout(doThePing,360000);	//=> 5 min 360000
	}

	function doThePing(){
		if(ws){
			ws.ping();	
			_pingsent++;
		}
		pingServer();
	}
}

//configure handling of messages for the different states
function MessageHandling(){
	var config = [];

	//handle setup request => send client information
	config[STATES.SETUP_REQ] = function(msgObj,con){
		con.sendMessage({type:TYPES.CAM_CLIENT},STATES.SETUP);
	};

	//connection setup has finished
	config[STATES.SETUP_DONE] = function(msgObj,con){
		//keep connection alive by pinging the server
		sendPing = true;
		pingServer();

		//setInterval(function(){			
	    //	ws.ping();	
		//	_pingsent++;
	    //},360000);	//=> 5 min 360000
	}
	config[STATES.IMG_REQ] = function (msgObj, con) {
        //get the latest image
	    var fileName = getLatestImage(con);
        //and prepare server for sending if binary data
	    con.sendMessage({ fileName: fileName }, STATES.BINARY_START_REQ);
	};
	config[STATES.BINARY_START_ACK] = function (msgObj, con) {
        //when server is ready => send binary data
	    sendImage(con);
	};
	config[STATES.DEFAULT] = function(msgObj,con){
		console.log(msgObj);
	};

	return config;
}

function getLatestImage(con) {
    //var RaspiCam = require("raspicam");
    //var date = new Date();
    //var imgString = "cam_"+date.getFullYear()+date.getMonth()+date.getDate()+"_"+date.getHours()+date.getMinutes()+".jpg";
    //var camera = new RaspiCam({ mode:"photo",output:imgString });

    ////to take a snapshot, start a timelapse or video recording
    //var process_id = camera.start();

    //to stop a timelapse or video recording
    //camera.stop( process_id );

    //remember path to the file and return its name
    var path = con.details.filePath = "/imgs/small.jpg";
    con.details.fileFromDir = false;
    return path.match(/\w+\.\w+$/)[0];
}

function sendImage(con) {
    var readStream = fs.createReadStream((con.details.fileFromDir?__dirname:"") + con.details.filePath);
    
    readStream.on('data', function (data) {
        con.webSocket.send(data, {binary:true,mask:true});
    });
    readStream.on("end", function () {
        con.sendState(STATES.BINARY_CLOSE);
    });
}