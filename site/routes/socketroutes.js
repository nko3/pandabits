var dispatcher = require('../../lib/dispatcher');

var messageId = 100;

module.exports = {
    "join": function(user) {
        this.broadcast.emit("message", {
            id: messageId++,
            content: {
                type: "message",
                data: "User '" + user.name + "' has joined."
            },
            user: "System",
            time: (new Date()).toString()  
        });
    },
    
    "changed:username": function(from, to) {
        this.broadcast.emit("message", {
            id: messageId++,
            content: {
                type: "message",
                data: "User '" + from + "' changed name to '" + to + "'."
            },
            user: "System",
            time: (new Date()).toString()  
        });
    },
    
    "message": function(message, fn) {
        var socket = this;

        var namespace = socket.namespace.name;
        var dispatch = dispatcher.dispatchers[namespace];
        
        var originalContent = message.content.data;        
        dispatch(message.content.data, function(err, type, response) {
            message.time = (new Date()).toString();
            message.id = messageId++;
            message.content.type = type;
            message.content.error = err || null;
            message.content.data = response || null;
            message.content.original = originalContent;
            
            // Emit to everybody else
            socket.emit("message", message);
            socket.broadcast.emit("message", message);
            
            // Send back the server-set ID and time
            //fn({id: message.id, time: message.time, content: message.content});
        });        
    },
    
    "onBreak": function(br, broadcast) {
        message = {};
        message.time = (new Date()).toString();
        message.id = messageId++;
        message.user = "System";
        message.silent = false;
        message.content = {};
        message.content.type = "break";
        message.content.error = null;
        message.content.data = br;
        broadcast("message", message);
    },
    
    "onStdout": function(str, broadcast) {
        message = {};
        message.time = (new Date()).toString();
        message.id = messageId++;
        message.user = "System - stdout";
        message.silent = false;
        message.content = {};
        message.content.type = "command";
        message.content.error = null;
        message.content.data = str;
        broadcast("message", message);
    },
    
    "onStdErr": function(str, broadcast) {
        message = {};
        message.time = (new Date()).toString();
        message.id = messageId++;
        message.user = "System - stderr";
        message.silent = false;
        message.content = {};
        message.content.type = "command";
        message.content.error = null;
        message.content.data = str;
        broadcast("message", message);
    }
};