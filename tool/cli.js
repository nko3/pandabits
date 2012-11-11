var DebugConnect = require('../lib/connector');
var program = require("commander");
var request = require('request');

program
    .version('0.0.1')
    .option('--attach <dest>', 'Attach to an existing process at <dest> (host:port)')
    .option('--port <port>', 'Port to run debugger on (5858)', 5858)
    .option('--pid <pid>', 'Attach to an existing process on <pid>')
    
var spawnChild = function(path, port, brk) {
    var spawn = require('child_process').spawn;
    
    debuggee = spawn('node', ['--debug-brk=' + port, path]);
    debuggee.on("exit", function() {
        console.log("CHILD EXITED");
    })
    
    debuggee.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });
    
    debuggee.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });
    
    process.on("exit", function() {
        console.log("EXITING");
        debuggee.kill();
    });
    
    return process.pid;
};

var attachToPid = function(server, serverport, port, pid, id) {
    process._debugProcess(pid);
    var connector = new DebugConnect(id, server, serverport, pid, port);
}

var attachToChild = function(server, serverport, port, pid, id) { 
    console.log(arguments);   
    var connector = new DebugConnect(id, server, serverport, pid, port);
};
    
var register = function(server, cb) {
    request("http://" + server + "/register", function(err, response, body) {
        if (err) {
            cb(err);
        }
        else {
            cb(null, JSON.parse(body));
        }
    });
};
    
var doRemote = function(cmd) {
    var options = program;
    if (!cmd && !options.attach) {
        console.log("Must supply either a script to run or an attach destination");
        return;
    }
    
    var pidAttach = !!options.pid;
    var pid = options.pid;
    var attach = options.attach; 
    
    if (!attach && !pid) {
        var port = options.port;
        var brk = options.brk;
        
        pid = spawnChild(cmd, port, brk);
        attach = "localhost:" + port;
    }
    
    if (!attach) {
        attach = "localhost:5858";
    }
    
    var host = attach.slice(0, attach.indexOf(":"));
    var port = attach.slice(attach.indexOf(":") + 1);
    
    if (!host || !port) {
        console.log("Must supply a valid attach destination:", attach);
        return;
    }
    
    port = parseInt(port);
    
    register("nodbg.com:3000", function(err, info) {
        if (err) {
            console.log("There was an error:", err);
            return;
        }
        
        if (!pidAttach) {
            // no --pid
            attachToChild("nodbg.com", info.debugport, port, pid, info.id);
        }
        else {
            // --pid
            attachToPid("nodbg.com", info.debugport, port, pid, info.id);
        }
        
        console.log("Connect to http://nodbg.com:3000/debug/" + info.id);
    });
};

var doLocal = function(cmd, config) {
    var options = program;
    if (!cmd && !options.attach) {
        console.log("Must supply either a script to run or an attach destination");
        return;
    }
    
    var pidAttach = !!options.pid;
    var pid = options.pid;
    var attach = options.attach; 
    
    if (!attach && !pid) {
        var port = options.port;
        var brk = options.brk;
        
        pid = spawnChild(cmd, port, brk);
        attach = "localhost:" + port;
    }
    
    if (!attach) {
        attach = "localhost:5858";
    }
    
    var host = attach.slice(0, attach.indexOf(":"));
    var port = attach.slice(attach.indexOf(":") + 1);
    
    if (!host || !port) {
        console.log("Must supply a valid attach destination:", attach);
        return;
    }
    
    port = parseInt(port);
    
    register("127.0.0.1:3000", function(err, info) {
        if (err) {
            console.log("There was an error:", err);
            return;
        }
        
        if (!pidAttach) {
            // no --pid
            attachToChild("127.0.0.1", info.debugport, port, pid, info.id);
        }
        else {
            // --pid
            attachToPid("127.0.0.1", info.debugport, port, pid, info.id);
        }
        
        console.log("Connect to http://localhost:3000/debug/" + info.id);
    });
};
    
program
    .command('remote [cmd]')
    .description('debug and connect to nodbg.com')
    .action(doRemote);
    
program
    .command('local [cmd]')
    .description('debug and connect locally')
    .action(doLocal);
    
program.parse(process.argv);