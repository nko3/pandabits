/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var socketio = require('socket.io');

var dispatcher = require('../lib/dispatcher');
var routes = require('./routes/socketroutes');

var app = express();

var server = http.createServer(app); 
var io = socketio.listen(server);

io.set('log level', 1);

var APP_PORT = process.env.PORT || 3000;
var DEBUG_PORT = process.env.DEBUG_PORT || 8888;

app.configure(function(){
  app.set('port', APP_PORT);
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

var namespaces = {};
var translators = {};

var net = require('net');
var dnode = require('dnode');
var DebugConnect = require('../lib/connector');
var debugServer = net.createServer(function(c) {
    var d = dnode();
    d.on('remote', function (remote) {
        translator = remote;
        translator.namespace(function(err, namespace) {    
          namespace = "/" + namespace;
          c.debugNamespace = namespace;
          dispatcher.createDispatcher(namespace, translator);
        
          translator.onBreak(function(br) {
            routes.onBreak(br, function(type, message) {
              io.of(namespace).emit(type, message);
            });
          });
          
          translator.fixStdout(
            function stdoutHook(str) {              
              routes.onStdout(str, function(type, message) {
                io.of(namespace).emit(type, message);
              });
            },
            function stderrHook(str) {              
              routes.onStderr(str, function(type, message) {
                io.of(namespace).emit(type, message);
              });
            },
            function() {
              console.log("DONE", arguments); 
            }
          );
          
          if (!namespaces[namespace]) {
            listenOnNamespace(namespace);
            namespaces[namespace] = true;
          }
          
          routes.onDebuggerConnected(function(type, message) {
            io.of(namespace).emit(type, message);
          });
          
          translators[namespace] = translator;
        });

        translator.connect(function() {console.log('Connected');});
    });
    c.on('close', function(has_error) {
      if (c.debugNamespace && namespaces[c.debugNamespace]) {
          routes.onDebuggerDisconnected(function(type, message) {
            io.of(c.debugNamespace).emit(type, message);
          });
      }
    });
    c.pipe(d).pipe(c);
});
debugServer.listen(DEBUG_PORT);

var ids = 0;
app.get('/register', function(req, res) {
  var namespace = "debug" + ids++;
  
  res.json({
    id: namespace,
    debugport: DEBUG_PORT
  })
});

var userCounter = 20;
app.get('/debug/:id', function(req, res) {
  var id = req.params.id;
  
  if (!namespaces["/" + id]) {
    listenOnNamespace("/" + id);
  }
  
  res.render('test.html', {
    id: id,
    user: userCounter++
  });
});

app.get('/test', function(req, res){
  res.render('test.html');
});

var listenOnNamespace = function(namespace) {  
  io.of(namespace).on('connection', function(socket) {    
    var translator = translators[namespace];    
    if (translator) {
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
    }
    
    _.each(routes, function(route, routeName) {
      socket.on(routeName, route);
    });
    
    if (!translator) {
      routes.onNoDebuggerAttached(function(type, message) {
        io.of(namespace).emit(type, message);
      });
    }
    else {
      routes.onDebuggerConnected(function(type, message) {
        io.of(namespace).emit(type, message);
      });
    }
  });
};

server.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});
