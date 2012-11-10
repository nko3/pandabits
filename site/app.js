
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
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
  app.set('view engine', 'jade');
  // make a custom html template
  app.engine('.html', function(path, options, callback){
      fs.readFile(path, function(err, file) {
        callback(err, err ? null : file.toString("utf-8"));
      });
    }
  );
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

app.get('/', routes.index);
app.get('/users', user.list);

app.get('/test', function(req, res){
  res.render('test.html');
});

var routes = require('./routes/socketroutes')

io.of("/abc").on('connection', function(socket) {
  _.each(routes, function(route, routeName) {
    socket.on(routeName, route);
  });
});

server.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});
