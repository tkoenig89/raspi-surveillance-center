var CONFIG = require("../config.js");

function getTimeString() {
    var d = new Date();
    var secs = d.getSeconds();
    return d.toLocaleTimeString() + ":" + (secs.length < 10 ? "0" + secs : secs);
}

var Logger = function () {
    var logMode = CONFIG.LOGGER.LOG_MODE;
    switch (logMode) {
    case 0:
        this.log_msg = false;
        this.log_err = false;
        this.log_debug = false;
        break;
    case 1:
        this.log_msg = false;
        this.log_err = true;
        this.log_debug = false;
        break;
    case 2:
        this.log_msg = true;
        this.log_err = true;
        this.log_debug = false;
        break;
    case 3:
        this.log_msg = true;
        this.log_err = true;
        this.log_debug = true;
        break;
    }
};

Logger.prototype = {
    debug: function debug(params) {
        if (this.log_debug) {
            Array.prototype.splice.call(arguments, 0, 0, getTimeString());
            Array.prototype.splice.call(arguments, 1, 0, "[DEB]");
            console.log.apply(this, arguments);
        }
    },
    log: function log(params) {
        if (this.log_msg) {
            Array.prototype.splice.call(arguments, 0, 0, getTimeString());
            Array.prototype.splice.call(arguments, 1, 0, "[LOG]");
            console.log.apply(this, arguments);
        }
    },
    err: function error(params) {
        if (this.log_err) {
            Array.prototype.splice.call(arguments, 0, 0, getTimeString());
            Array.prototype.splice.call(arguments, 1, 0, "[ERR]");
            console.log.apply(this, arguments);
        }
    }

};

module.exports = new Logger();