var CONST = require("../public/constants");

function getTimeString() {
    var d = new Date();
    var secs = d.getSeconds();
    return d.toLocaleTimeString() + ":" + (secs.length < 10 ? "0" + secs : secs);
}

var Logger = function () {
	var logMode = CONST.LOG_MODE;
	switch(logMode){
		case 0:
			this.log_msg = false;
			this.log_err = false;	
			break;
		case 1:
			this.log_msg = false;
			this.log_err = true;	
			break;
		case 2:
			this.log_msg = true;
			this.log_err = true;	
			break;
	}
};

Logger.prototype = {
    log: function log(params) {
		if(this.log_msg){
			Array.prototype.splice.call(arguments, 0, 0, getTimeString());
			Array.prototype.splice.call(arguments, 1, 0, "[LOG]");
			console.log.apply(this, arguments);
		}
    },
    err: function error(params) {
		if(this.log_err){
			Array.prototype.splice.call(arguments, 0, 0, getTimeString());
			Array.prototype.splice.call(arguments, 1, 0, "[ERR]");
			console.log.apply(this, arguments);
		}
    }

};

module.exports = new Logger();