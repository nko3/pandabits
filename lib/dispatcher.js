var _ = require('underscore');

var evaluate = function(translator, message, cb) {
    translator.evaluateAtFrame(message, 0, function(err, res) {
        if (err) {
            cb(err);
            return;
        }
        
        translator.mirror(res, 3, function(err, res) {
            cb(err, "evaluate", res);
        });
    });
};

var backtrace = function(translator, cb) {
    console.log("BACKTRACE");
    
    translator.backtrace(null, null, null, function(err, res) {
        cb(err, "backtrace", res); 
    });
};

var nyi = function() {
    var args = _.toArray(arguments);
    var cb = args[args.length - 1];
    cb("NYI!");
}

var dispatchMap = {
    "!cont": nyi,
    "!c": nyi,
    "!go": nyi,
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
    "!eval": evaluate
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
            var tokens = message.split(" ");
            var command = tokens[0];
            var args = tokens.slice();
            var commmandFunction = dispatchMap[command] || nyi;
            
            args[0] = translator;
            args.push(cb);
            commmandFunction.apply(null, args);
        }
    };
};

exports.dispatchers = {};