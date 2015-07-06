var com = require("./BaseCommunicator.js");
var t = com.connect("www.google.de");

t.on("test",function(d){
    console.log(d);
});

t.receive('{"ev":"test","pl":"2"}');