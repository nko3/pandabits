var DebugConnect = require('../lib/connector');
var program = require('commander');
var request = require('request');
var open = require('open')

program
    .version('0.0.1')
    .option('--attach <dest>', 'Attach to an existing process at <dest> (host:port)')
    .option('--port <port>', 'Port to run debugger on (default: 5858)', 5858)
    .option('--pid <pid>', 'Attach to an existing process on <pid>')
    .option('--serverport <port>', 'Port to start web server on (default: 3000)', 3000)
    .option('--debugport <port>', 'Port to start debug server on (default: 8888)', 8888)
    .option('--nobrowser', 'Don\'t open a browser automatically when connected')
    
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
var openBrowser = function(url) {    
    if (!program.nobrowser) {
        open(url);
    }
}

var spawnServer = function() {
    process.env.PORT = program.serverport || 3000;
    process.env.DEBUG_PORT = program.debugport || 8888;
    
    var spawn = require('child_process').spawn;
    var server = spawn('node', [__dirname+'/../server.js']);
    process.on("exit", function() {
        server.kill();
    });
    server.on("exit", function() {
        console.log("ERROR: webserver died!");
    });
}

var attachToPid = function(server, serverport, port, pid, id) {
    process._debugProcess(pid);
    var connector = new DebugConnect(id, server, serverport, pid, port);
}

var attachToChild = function(server, serverport, port, pid, id) { 
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
    
    register("www.nodbg.com", function(err, info) {
        if (err) {
            console.log("There was an error:", err);
            return;
        }
        
        if (!pidAttach) {
            // no --pid
            attachToChild("www.nodbg.com", info.debugport, port, pid, info.id);
        }
        else {
            // --pid
            attachToPid("www.nodbg.com", info.debugport, port, pid, info.id);
        }

        var params = {
            name: info.id,
            serverhost: "www.nodbg.com",
            serverport: program.serverport,
            debugserverport: info.debugport,
            debugport: port,
            debugpid: pid
        }
        
        console.log("- nodbg params:", JSON.stringify(params));
        console.log("- nodbg started!");
        console.log("- Connect to http://www.nodbg.com/debug/" + info.id);
        console.log();
        
        openBrowser("http://www.nodbg.com/debug/" + info.id);
    });
};

var doLocal = function(cmd, config) {
    var options = program;
    if (!cmd && !options.attach) {
        console.log("Must supply either a script to run or an attach destination");
        return;
    }
    spawnServer();
    setTimeout(function() { 
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
        
        register("127.0.0.1:" + program.serverport, function(err, info) {
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
            
            var params = {
                name: info.id,
                serverhost: "127.0.0.1",
                serverport: program.serverport,
                debugserverport: info.debugport,
                debugport: port,
                debugpid: pid
            }
            
            console.log("- nodbg params:", JSON.stringify(params));
            console.log("- nodbg started!");
            console.log("- Connect to http://localhost:" + program.serverport + "/debug/" + info.id);
            console.log();
            
            openBrowser("http://localhost:" + program.serverport + "/debug/" + info.id);
        });
    }, 500);
};
    
program
    .command('remote [cmd]')
    .description('debug and connect to www.nodbg.com')
    .action(doRemote);
    
program
    .command('local [cmd]')
    .description('debug and connect locally')
    .action(doLocal);

program
    .command('*')
    .description('debug and connect to www.nodbg.com')
    .action(doRemote);
    
program
    .command('help')
    .description("display help")
    .action(function() {
        program.help();
    });
    
program
    .command('*')
    .action(function() {
        console.log("  Unknown command:", program.args[0]);
        program.help();
    });
    
program.parse(process.argv);

if (program.args.length === 0) {
    program.help();
}
