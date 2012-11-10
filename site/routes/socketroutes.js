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

        var dispatch = dispatcher.dispatchers[socket.namespace.name];
        dispatch(message.content.data, function(err, type, response) {
            message.time = (new Date()).toString();
            message.id = messageId++;
            message.content.type = type;
            message.content.data = response;
            
            // Emit to everybody else
            socket.broadcast.emit("message", message);
            
            // Send back the server-set ID and time
            fn({id: message.id, time: message.time, content: message.content});
        });        
    }
};