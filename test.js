var com = require("./BaseCommunicator.js");
var t = com.server(8080);

t.on("http",function(server,req,res,path){
    console.log("http at path: ",path);
    res.end("test");
});

t.on("connected",function(server,ws){
    console.log("client connected");
    var client = t.addClient(ws);
    
    client.on("tmsg",function(server,data){
        console.log("msg",data);    
    }); 
    
    client.send(null,"tmsg");
});