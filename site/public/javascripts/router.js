(function() {
    var Router = Backbone.Router.extend({
        
    });
    
    window.App = new Router();
    window.App.Router = Router;
    
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
        
        console.log(message);
        
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
            case "go": {
                console.log("GO GO", App.highlight);
                if (App.highlight) {
                    var file = App.files.get(App.highlight.script);
                    if (file) {
                        console.log("unset", file.get("path"));
                        file.unset("highlight");
                    }
                    App.highlight = null;
                }
                break;
            }
            case "break": {
                console.log("BREAK", message);
                var br = message.content.data.data;
                
                console.log("BREAK2", App.highlight);
                if (App.highlight) {
                    var prevFile = App.files.get(App.highlight.script);
                    console.log("UNSETTING");
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
        }
    };
})();