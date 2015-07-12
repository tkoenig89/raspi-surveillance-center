function getTimeString() {
    var d = new Date();
    var secs = d.getSeconds();
    return d.toLocaleTimeString() + ":" + (secs.length < 10 ? "0" + secs : secs);
}

var Logger = function () {

};
Logger.prototype = {
    log: function log(params) {
        Array.prototype.splice.call(arguments, 0, 0, getTimeString());
        Array.prototype.splice.call(arguments, 1, 0, "[LOG]");
        console.log.apply(this, arguments);
    },
    err: function error(params) {
        Array.prototype.splice.call(arguments, 0, 0, getTimeString());
        Array.prototype.splice.call(arguments, 1, 0, "[ERR]");
        console.log.apply(this, arguments);
    }

};

module.exports = new Logger();