(function() {
    var Router = Backbone.Router.extend({
        
    });
    
    window.App = new Router();
    window.App.Router = Router;
    
    window.App.currentFrame = 0;
    
    window.App.sendMessage = function(message, silent) {
        message = {
            user: App.currentUser.get("name"),
            silent: silent === undefined ? false : silent,
            content: {
                data: message,
                type: "message"
            },
            time: (new Date()).toString()
        }
        
        App.socket.emit("message", message);
        
        return message;
    },
    
    window.App.handleMessage = function(message) {        
        if (!message.silent || !message.hasOwnProperty("silent")) {
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
                
                App.breakpoints.each(function(breakpoint) {
                    App.breakpoints.trigger("add", breakpoint, App.breakpoints); 
                });
                
                if (App.highlight) {
                    var file = App.files.get(App.highlight.script);
                    if (file) {
                        App.trigger("change:active", file);
                        file.set("highlight", App.highlight.line);
                    }
                }
                
                $(window).resize();
                
                break;
            }
            case "setbreakpoint": {
                var breakpoint = message.content.data;
                if (breakpoint) {
                    breakpoint.id = breakpoint.breakpoint;
                    App.breakpoints.add(breakpoint);
                }
                break;
            }
            case "removebreakpoint": {
                var breakpoint = message.content.data;
                if (breakpoint) {                    
                    var model = App.breakpoints.get(breakpoint.breakpoint);
                    App.breakpoints.remove(model);
                }
                break;
            }
            case "listbreakpoints": {
                var breakpoints = message.content.data;
                if (breakpoints) {
                    _.each(breakpoints.breakpoints, function(breakpoint) {
                        breakpoint.id = breakpoint.number;
                        App.breakpoints.add(breakpoint);
                    });
                }
                break;
            }
            case "stepin":
            case "stepover":
            case "stepout":
            case "go": {                
                App.isPaused = false;
                if (App.highlight) {
                    var file = App.files.get(App.highlight.script);
                    if (file) {
                        file.unset("highlight");
                    }
                    App.highlight = null;
                }
                break;
            }
            case "frame": {
                if (!message.content.error) {
                    App.currentFrame = (message.content.data || {}).frame;
                }
                break;
            }
            case "break": {
                var br = message.content.data.data;
                
                App.currentFrame = br.frame || 0;
                App.isPaused = true;
                
                if (App.highlight) {
                    var prevFile = App.files.get(App.highlight.script);
                    if (prevFile) {
                        prevFile.unset("highlight");
                    }
                    App.highlight = null;
                }
                
                App.highlight = {
                    script: br.script.name,
                    line: br.sourceLine
                };
                    
                var file = App.files.get(br.script.name);
                if (!file) {
                    App.sendMessage("!loadfile " + br.script.name, true);
                }
                else {
                    App.trigger("change:active", file);
                    file.set("highlight", br.sourceLine);
                }
                
                break;
            }
            case "stdout":
            case "stderr": {
                var lastMessage = App.messages.at(App.messages.length - 1);
                if (lastMessage && lastMessage.get('content').type === message.content.type) {
                    lastMessage.get('content').data += message.content.data;
                    App.messages.trigger("change:output", lastMessage);
                }
                else {
                    App.messages.add(message);
                }
            }
        }
    };
})();