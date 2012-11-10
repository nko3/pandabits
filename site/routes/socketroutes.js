var messageId = 100;

module.exports = {
    "join": function(user) {
        this.broadcast.emit("message", {
            id: messageId++,
            content: "User '" + user.name + "' has joined.",
            user: "System",
            time: (new Date()).toString()  
        });
    },
    
    "changed:username": function(from, to) {
        this.broadcast.emit("message", {
            id: messageId++,
            content: "User '" + from + "' changed name to '" + to + "'.",
            user: "System",
            time: (new Date()).toString()  
        });
    },
    
    "message": function(message, fn) {
        message.time = (new Date()).toString();
        message.id = messageId++;
        
        // Emit to everybody else
        this.broadcast.emit("message", message);
        
        // Send back the server-set ID and time
        fn({id: message.id, time: message.time});
    }
};