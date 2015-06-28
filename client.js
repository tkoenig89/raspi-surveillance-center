var $C = require("./common");
var STATES = $C.STATES;
var TYPES = $C.TYPES;
var ComHandler = $C.CommunicationHandler;
var ConnectionHandler = $C.ConnectionHandler;
var connection = null;

ComHandler.configure(MessageHandling());

var WebSocket = require('ws'),
	ws = new WebSocket('wss://raspinobody.ddns.net:8080/', null, { rejectUnauthorized: false });

ws.on('open', function() {
	connection = ConnectionHandler.add(ws);	
});

ws.on('message', function(message) {
	ComHandler.handleMessage(message,connection);
});

//configure handling of messages for the different states
function MessageHandling(){
	var config = [];

	//handle setup request => send client information
	config[STATES.SETUP_REQ] = function(msgObj,con){
		con.sendMessage({type:TYPES.APP_CLIENT},STATES.SETUP);
	};

	//connection setup has finished
	config[STATES.SETUP_DONE] = function(msgObj,con){
		//ask for an img
		con.sendState(STATES.IMG_REQ);
	}

	config[STATES.DEFAULT] = function(msgObj,con){
		console.log(msgObj);
	};

	return config;
}
