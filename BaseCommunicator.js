var webSockets = require('ws');
var url = require('url');
var https = require('https');
var http = require('http');
var fs = require('fs');

var CONST = require("./public/constants");
var Basesocket = require("./modules/Basesocket");


/*
* 
*/
function _server(port,keyFile,certFile){
    //load ssl certificate from file
    if(keyFile){
        var privateKey = fs.readFileSync(keyFile, 'utf8');
        var certificate = fs.readFileSync(certFile, 'utf8');
    }
    //create server
    var server = new Server({
        ssloptions: keyFile && { key: privateKey, cert: certificate },
        port: port
    });

    return server;
}

module.exports= {
    connect:_connect,
    server:_server
}