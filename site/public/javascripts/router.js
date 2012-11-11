(function() {
    var Router = Backbone.Router.extend({
        
    });
    
    window.App = new Router();
    window.App.Router = Router;
    
    window.App.sendMessage = function(message, fn) {
        message = {
            user: App.currentUser.get("name", fn),
            content: {
                data: message,
                type: "message"
            },
            time: (new Date()).toString()
        }
        
        App.socket.emit("message", message, function(response) {
            App.handleMessage(response, true);
            fn(response);
        });
        
        return message;
    },
    
    window.App.handleMessage = function(message, dontAdd) {
        if (!dontAdd) {
            App.messages.add(message);
        }
        
        if (message.error) {
            return;
        }
        
        switch(message.content.type) {
            case "loadfile": {
                var files = message.content.data;
                _.each(files, function(rawFile) {
                    rawFile.code = rawFile.source;
                    rawFile.id = rawFile.name;
                    rawFile.path = rawFile.name; 
                });
                
                App.files.add(files);
                
                break;
            }
        }
    };
})();