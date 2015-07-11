var Client = require("./modules/Client");
var client = new Client({
    url: "localhost:8080"
});

client.on("connected", function () {
    console.log("connected");
    client.send({
        d: "x"
    }, "tmsg");
});

client.on("tmsg", function (server, data) {
    console.log("msg", data);
});