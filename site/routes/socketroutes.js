var messageId = 100;

module.exports = {
    "message": function(message, fn) {
        message.id = messageId++;
        this.broadcast.emit("message", message);
        fn(message.id);
    }
};