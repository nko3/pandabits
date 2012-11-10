
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

var routes = require('./routes/socketroutes')

var listenOnNamespace = function(namespace) {
  io.of("/" + namespace).on('connection', function(socket) {
    _.each(routes, function(route, routeName) {
      socket.on(routeName, route);
    });
  });
};

server.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});
