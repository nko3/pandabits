var _ = require('underscore');

var evaluate = function(translator, rest, cb) {
    translator.evaluateAtFrame(rest, 0, function(err, res) {
        if (err) {
            cb("Error evaluating!", "evaluate");
            return;
        }
        
        translator.mirror(res, 3, function(err, res) {
            cb(err ? "Error evaluating!" : null, "evaluate", res);
        });
    });
};

var backtrace = function(translator, rest, cb) {    
    translator.backtrace(null, null, null, function(err, res) {
        cb(err ? err.message : null, "backtrace", res); 
    });
};

var pause = function(translator, rest, cb) {
    translator.brk(function(err, res) {
        cb(err ? "Error pausing" : null, "command", res);
    });
};

var cont = function(translator, rest, cb) {
    translator.go(function(err, res) {
        cb(err ? "Error continuing" : null, "command", res);
    });
};

var nyi = function() {
    var args = _.toArray(arguments);
    var cb = args[args.length - 1];
    cb("NYI!");
}

var dispatchMap = {
    "!cont": cont,
    "!c": cont,
    "!go": cont,
    "!step": nyi,
    "!stepup": nyi,
    "!up": nyi,
    "!out": nyi,
    "!stepover": nyi,
    "!over": nyi,
    "!next": nyi,
    "!backtrace": backtrace,
    "!bt": backtrace,
    "!setbreakpoint": nyi,
    "!eval": evaluate,
    "!pause": pause,
    "!break": pause
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
            
            console.log(rest, command, message, message.indexOf(" "));
            
            var args = [translator, rest, cb];
            var commmandFunction = dispatchMap[command] || nyi;
            
            commmandFunction.apply(null, args);
        }
    };
};

exports.dispatchers = {};