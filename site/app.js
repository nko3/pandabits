
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var socketio = require('socket.io');

var app = express();

var server = http.createServer(app); 
var io = socketio.listen(server);

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view options', {
    layout: false
  });
  app.set('view engine', 'html');
  app.engine('html', require('hbs').__express);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var userCounter = 20;
app.get('/debug/:id', function(req, res) {
  var id = req.params.id;
  
  if (!_.has(io.sockets.manager.namespaces, "/" + id)) {
    listenOnNamespace(id);
  }
  
  res.render('test.html', {
    id: id,
    user: userCounter++
  });
});

app.get('/test', function(req, res){
  res.render('test.html');
});

var dispatcher = require('../lib/dispatcher');
var routes = require('./routes/socketroutes');

var listenOnNamespace = function(namespace) {  
  io.of("/" + namespace).on('connection', function(socket) {
    _.each(routes, function(route, routeName) {
      socket.on(routeName, route);
    });
    
    translator.lastBreak(function(lastBreak) {
        translator.broken(function(broken) {
          if (lastBreak && broken) {
            translator.frame(function(frame) {
              lastBreak.data.frame = frame;
              routes.onBreak(lastBreak, function(type, message) {
                socket.emit(type, message);
              });
            });
          }
      });
    });
  });
  
  dispatcher.createDispatcher("/" + namespace, translator);
  translator.onBreak(function(br) {
    routes.onBreak(br, function(type, message) {
      io.of("/" + namespace).emit(type, message);
    });
  });
  
  translator.fixStdout(
    function stdoutHook(str) {
      console.log("hook1", str);
      
      routes.onStdout(str, function(type, message) {
        console.log("stdout", message);
        io.of("/" + namespace).emit(type, message);
      });
    },
    function stderrHook(str) {
      routes.onStderr(str, function(type, message) {
        console.log("stderr", message);
        io.of("/" + namespace).emit(type, message);
      });
    },
    function() {
      console.log("DONE", arguments); 
    }
  );
};

server.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});

var spawn = require('child_process').spawn;

debuggee = spawn('node', ['test/test.js']);
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
  debuggee.kill();
});

var translator = null;
var connector = null;
var socket = null;
var d = null;
var net = require('net');
var dnode = require('dnode');
setTimeout(function() {
  var DebugConnect = require('../lib/connector');
  var server = net.createServer(function(c) {
      var d = dnode();
      d.on('remote', function (remote) {
          translator = remote;
          translator.connect(function() {console.log('Connected');});
      });
      socket = c;
      c.pipe(d).pipe(c);
  });
    server.listen(8888, function() {
    // = new DebugTranslator(debuggee.pid, 5858);
    connector = new DebugConnect('127.0.0.1', 8888, debuggee.pid, 5858);
    //connector.connect(function() {
    //    connector.cont();
    //});
  });
  
  
}, 100);
