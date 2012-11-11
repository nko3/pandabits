var program = require("commander");

program
    .version('0.0.1')
    .option('-a, --attach <dest>', 'Attach to an existing process at [dest] (host:port)')
    .option('-p, --port <port>', 'Port to run debugger on (5858)', 5858)
    
var spawnChild = function(path, port, brk) {
    var spawn = require('child_process').spawn;
    
    debuggee = spawn('node', ['--debug=' + port, path]);
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

var attachToChild = function(host, port, pid) {
    var DebugConnect = require('../lib/connector');
    
    console.log(pid, port);
    
    var connector = new DebugConnect("foo", '127.0.0.1', 8888, pid, port);
};
    
var doRemote = function(cmd) {
    var options = program;
    if (!cmd && !options.attach) {
        console.log("Must supply either a script to run or an attach destination");
        return;
    }
};

var doLocal = function(cmd, config) {
    var options = program;
    if (!cmd && !options.attach) {
        console.log("Must supply either a script to run or an attach destination");
        return;
    }
    
    var pid = null;
    var attach = options.attach;
    
    if (!attach) {
        var port = options.port;
        var brk = options.brk;
        
        pid = spawnChild(cmd, port, brk);
        attach = "localhost:" + port;
    }
    
    var host = attach.slice(0, attach.indexOf(":"));
    var port = attach.slice(attach.indexOf(":") + 1);
    
    if (!host || !port) {
        console.log("Must supply a valid attach destination:", attach);
        return;
    }
    
    port = parseInt(port);
    
    attachToChild(host, port, pid);
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