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
        
        App.socket.emit("message", message, fn);
        
        return message;
    }
})();