var DebugConnect = require('../lib/connector');
var program = require("commander");
var request = require('request');

var spawnChild = function(path, port, brk) {
    var spawn = require('child_process').spawn;
    
    debuggee = spawn('node', ['--debug-brk=' + port, path]);
    debuggee.on("exit", function() {
        console.log("- debuggee exited!");
    })
    
    debuggee.stdout.on('data', function (data) {
        process.stdout.write(data);
    });
    
    debuggee.stderr.on('data', function (data) {
        process.stderr.write(data);
    });
    
    process.on("exit", function() {
        debuggee.kill();
    });
    
    return process.pid;
};

var register = function(server, cb) {
    request("http://" + server + "/register?namespace=nkodemo", function(err, response, body) {
        if (err) {
            cb(err);
        }
        else {
            cb(null, JSON.parse(body));
        }
    });
};

var attachToChild = function(server, serverport, port, pid, id) { 
    var connector = new DebugConnect(id, server, serverport, pid, port);
};
    
var doRemote = function(cmd) {
    var options = program;
    if (!cmd && !options.attach) {
        console.log("Must supply either a script to run or an attach destination");
        return;
    }
    
        
    pid = spawnChild(cmd, 5858);
    attach = "localhost:5858";

    
    var host = attach.slice(0, attach.indexOf(":"));
    var port = attach.slice(attach.indexOf(":") + 1);
    
    port = parseInt(port);
    
    register("nodbg.com", function(err, info) {
        if (err) {
            console.log("There was an error:", err);
            return;
        }
        
        attachToChild("nodbg.com", info.debugport, port, pid, info.id);

        var params = {
            name: info.id,
            serverhost: "nodbg.com",
            serverport: program.serverport,
            debugserverport: info.debugport,
            debugport: port,
            debugpid: pid
        }
        
        console.log("- nodbg params:", JSON.stringify(params));
        console.log("- nodbg started!");
        console.log("- Connect to http://nodbg.com/debug/" + info.id);
        console.log();
    });
};

doRemote(__dirname + '/../test/test.js');
