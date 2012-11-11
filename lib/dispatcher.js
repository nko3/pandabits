var _ = require('underscore');

var evaluate = function(translator, rest, cb) {
    translator.evaluateAtCurrentFrame(rest, function(err, res) {
        if (err) {
            cb(err.message, "evaluate");
            return;
        }
        
        translator.mirror(res, 3, function(err, res) {
            cb(err ? (err.message || "Error evaluating!") : null, "evaluate", res);
        });
    });
};

var backtrace = function(translator, rest, cb) {    
    translator.backtrace(null, null, null, function(err, res) {
        cb(err ? err.message : null, "backtrace", res); 
    });
};

var pause = function(translator, rest, cb) {
    translator.brk(function(err, res, handles) {
        cb(err ? "Error pausing" : null, "command", res);
    });
};

var cont = function(translator, rest, cb) {
    translator.cont(function(err, res) {
        cb(err ? "Error continuing" : null, "go", res);
    });
};

var stepIn = function(translator, rest, cb) {
    var steps = 1;
    try {
        steps = parseInt(rest);
    }  
    catch(ex) {
        // nothing
    }
    
    translator.stepIn(steps, function(err, res) {
        cb(err ? "Error stepping in" : null, "command", res); 
    });
};

var stepOver = function(translator, rest, cb) {
    var steps = 1;
    try {
        steps = parseInt(rest);
    }  
    catch(ex) {
        // nothing
    }
    
    translator.stepOver(steps, function(err, res) {
        cb(err ? "Error stepping over" : null, "command", res); 
    });
};

var stepOut = function(translator, rest, cb) {    
    translator.stepOut(function(err, res) {
        cb(err ? "Error stepping out" : null, "command", res); 
    });
};

var setBreakpoint = function(translator, rest, cb) {
    var separator = rest.lastIndexOf(":");
    
    var file = null;
    var line = null;
    
    if (separator >= 0) {
        file = rest.slice(0, separator);
        line = rest.slice(separator + 1);
    }
    
    translator.setBreakpoint(file, line, function(err, res) {
        cb(err ? "Error setting breakpoint" : null, "setbreakpoint", res);
    });
};

var removeBreakpoint = function(translator, rest, cb) {
    var separator = rest.lastIndexOf(":");
    
    var file = null;
    var line = null;
    var breakpoint = null;
    
    if (separator >= 0) {
        file = rest.slice(0, separator);
        line = rest.slice(separator + 1);
        
        translator.removeBreakpoint(file, line, function(err, res) {
            cb(err ? "Error remvoing breakpoint" : null, "removebreakpoint", res);
        });
    }
    else {
        breakpoint = parseInt(rest);
        translator.removeBreakpointById(breakpoint, function(err, res) {
            cb(err ? "Error removing breakpoint" : null, "removebreakpoint", res);
        });
    }
    
};

var listBreakpoints = function(translator, rest, cb) {
    translator.listBreakpoints(function(err, res) {
        cb(err ? "Error setting breakpoint" : null, "listbreakpoints", res);
    });
};

var loadFiles = function(translator, rest, cb) {
    var file = rest || null;
    translator.loadFiles(file, function(err, res) {
         cb(err ? err : null, "loadfile", res);
    });
};

var showScripts = function(translator, rest, cb) {
    translator.scripts(function(err, res) {
        cb(err ? "Error loading scripts!" : null, "scripts", res); 
    });
};

var nyi = function(translator, rest, cb, command) {
    var args = _.toArray(arguments);
    cb("Command '" + command + "' does not exist.", "command", null);
}

var dispatchMap = {
    "!cont": cont,
    "!c": cont,
    "!go": cont,
    "!step": stepIn,
    "!in": stepIn,
    "!stepup": stepOut,
    "!up": stepOut,
    "!out": stepOut,
    "!stepover": stepOver,
    "!over": stepOver,
    "!next": stepOver,
    "!backtrace": backtrace,
    "!bt": backtrace,
    "!eval": evaluate,
    "!pause": pause,
    "!break": pause,
    "!setbreakpoint": setBreakpoint,
    "!setbp": setBreakpoint,
    "!sbp": setBreakpoint,
    "!removebreakpoint": removeBreakpoint,
    "!clearbreakpoint": removeBreakpoint,
    "!removebp": removeBreakpoint,
    "!clearbp": removeBreakpoint,
    "!rbp": removeBreakpoint,
    "!lbp": listBreakpoints,
    "!bps": listBreakpoints,
    "!loadfile": loadFiles,
    "!scripts": showScripts,
}

exports.createDispatcher = function(name, translator) {
    exports.dispatchers[name] = function(message, cb) {
        message = (message || "").trim();
        
        if (!message) {
            return;
        }
        
        if (message[0] !== "!") {
            evaluate(translator, message, cb);
            return;
        }
        else {
            var rest = "";
            var command = message;
            if (message.indexOf(" ") >= 0) {
                rest = message.slice(message.indexOf(" ") + 1).trim();
                command = message.slice(0, message.indexOf(" ") + 1).trim();
            }
            
            var args = [translator, rest, cb, command];
            var commmandFunction = dispatchMap[command] || nyi;
            
            commmandFunction.apply(null, args);
        }
    };
};

exports.dispatchers = {};