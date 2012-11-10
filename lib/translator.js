var V8Debugger = require('../ext/lib-v8debug/lib/v8debug/index').V8Debugger;
var V8DebuggerService = require('../ext/lib-v8debug/lib/v8debug/index').StandaloneV8DebuggerService;
var net = require('net');
var assert = require('assert');
var _ = require('underscore');

var callbackModifier = function(cb) {
    cb = cb || function() {};
    return function(res, handles, err) {
        cb(err, res, handles);
    };
};

var DebugTranslator = module.exports = function(pid, port) {
    this.pid = pid;
    this.port = port;
    
    this.breakpoints = {};
    
    // Setup that we are a debugger
    process._debugProcess(pid);
    
    this.sock = net.connect(this.port, '127.0.0.1');
    
    this.service = new V8DebuggerService(this.sock);
    this.client = new V8Debugger(0, this.service);
    
    this.service.attach(0, function() {});
};

DebugTranslator.prototype.isRunning = function() {
    return this.client.isRunning();
}

DebugTranslator.prototype.connect = function(cb) {    
    this.service.attach(0, callbackModifier(cb));
    
    return this;
};

DebugTranslator.prototype.brk = function(cb) {
    cb = cb || function() {};
    
    this.client.suspend(callbackModifier(cb));
    
    return this;
};

DebugTranslator.prototype.cont = function(cb) {
    cb = cb || function() {};
    
    this.client.continueScript(null, null, callbackModifier(cb));
    
    return this;
};

DebugTranslator.prototype.evaluateGlobal = function(expression, cb) {
    cb = cb || function() {};
    this.client.evaluate(expression, null, true, null, function(res, handles, err) {
        cb(err, res, handles);
    });
    
    return this;
};

DebugTranslator.prototype.evaluateAtFrame = function(expression, frame, cb) {
    cb = cb || function() {};
    this.client.evaluate(expression, frame, false, null, callbackModifier(cb));
    
    return this;
};

DebugTranslator.prototype.lookup = function(handles, cb) {
    cb = cb || function() {};
    this.client.lookup(handles, false, callbackModifier(cb));
    
    return this;
};

DebugTranslator.prototype.setBreakpoint = function(file, line, cb) {
    cb = cb || function() {};
    var that = this;
    this.client.setbreakpoint("script", file, line, 0, true, null, 0, function(resp) {
        if (resp && resp.breakpoint) {
            that.breakpoints[file + ":" + line] = resp.breakpoint;
        }
        
        callbackModifier(cb).apply(null, arguments);
    });
    
    return this;
};

DebugTranslator.prototype.removeBreakpoint = function(file, line, cb) {
    var breakpoint = null;
    if (_.isFunction(file)) {
        cb = file;
        file = null;
        line = null;
    }
    else if (cb === null && _.isFunction(line)) {
        cb = line;
        line = null;
        breakpointNumber = file;
    }
        
    cb = cb || function() {};
    
    breakpoint = (breakpoint || breakpoint === 0) ? breakpoint : this.breakpoints[file + ":" + line];
    delete this.breakpoints[breakpoint];
    
    this.client.clearbreakpoint(breakpoint, callbackModifier(cb));
    
    return this;
};

DebugTranslator.prototype.enableBreakpoint = function(file, line, cb) {
    var breakpoint = null;
    if (_.isFunction(file)) {
        cb = file;
        file = null;
        line = null;
    }
    else if (cb === null && _.isFunction(line)) {
        cb = line;
        line = null;
        breakpointNumber = file;
    }
    
    cb = cb || function() {};
    
    breakpoint = (breakpoint || breakpoint === 0) ? breakpoint : this.breakpoints[file + ":" + line];
    this.client.changebreakpoint(breakpoint, true, null, 0, callbackModifier(cb));
    
    return this;
};

DebugTranslator.prototype.disableBreapoint = function(file, line, cb) {
    var breakpoint = null;
    if (_.isFunction(file)) {
        cb = file;
        file = null;
        line = null;
    }
    else if (cb === null && _.isFunction(line)) {
        cb = line;
        line = null;
        breakpointNumber = file;
    }
    
    cb = cb || function() {};
    
    breakpoint = (breakpoint || breakpoint === 0) ? breakpoint : this.breakpoints[file + ":" + line];
    this.client.changebreakpoint(breakpoint, false, null, 0, callbackModifier(cb));
    
    return this;
};

DebugTranslator.prototype.listBreakpoints = function(cb) {
    cb = cb || function() {};
    this.client.listbreakpoints(callbackModifier(cb));
    
    return this;
};

DebugTranslator.prototype.enableBreakOnException = function(all, cb) {
    cb = cb || function() {};
    all = all && 'all';
    all = all || 'uncaught';
    this.client.setExceptionBreak(all, callbackModifier(cb));
    
    return this;
};

DebugTranslator.prototype.disableBreakOnException = function(cb) {
    cb = cb || function() {};
    this.client.setExceptionBreak("", callbackModifier(cb));
    
    return this;
};

DebugTranslator.prototype.backtrace = function(from, to, bottom, cb) {
    if (_.isFunction(from) && !to && !bottom && !cb) {
        cb = from;
        from = null;
    }
    
    cb = cb || function() {};
    
    var that = this;
    this.client.backtrace(from, to, bottom, null, function(res, refs, err) {
        if (err) {
            cb(err);
            return;
        }
        
        if (res.totalFrames <= 0) {
            cb("No frames!");
            return;
        }
        
        var lookupRefs = [];
        for(var i = 0; i < res.frames.length; i++) {
            var frame = res.frames[i];
            lookupRefs.push(frame.script.ref);
            lookupRefs.push(frame.func.ref);
            lookupRefs.push(frame.receiver.ref);
        }
        
        that.lookup(lookupRefs, function(err, lookupRes, lookupRefs) {
            if (err) {
                cb(err);
                return;
            }
            
            for(var i = 0; i < res.frames.length; i++) {
                var frame = res.frames[i];
                frame.script = lookupRes[frame.script.ref];
                frame.func = lookupRes[frame.func.ref];
                frame.receiver = lookupRes[frame.receiver.ref];
            }
            
            cb(null, res, refs);
        });
        
    });
    
    return this;
};

DebugTranslator.prototype.scripts = function(cb) {
    cb = cb || function() {};
    this.client.scripts(V8Debugger.NORMAL_SCRIPTS, null, true, callbackModifier(cb));
    
    return this;
};

DebugTranslator.prototype.mirror = function(handle, depth, cb) {
    cb = cb || function() {};
    var self = this;

    var val;

    if (handle.type === 'object') {
        // The handle looks something like this:
        // { handle: 8,
        //   type: 'object',
        //   className: 'Object',
        //   constructorFunction: { ref: 9 },
        //   protoObject: { ref: 4 },
        //   prototypeObject: { ref: 2 },
        //   properties: [ { name: 'hello', propertyType: 1, ref: 10 } ],
        //   text: '#<an Object>' }
        
        // For now ignore the className and constructor and prototype.
        // TJ's method of object inspection would probably be good for this:
        // https://groups.google.com/forum/?pli=1#!topic/nodejs-dev/4gkWBOimiOg
        
        var propertyRefs = handle.properties.map(function(p) {
            return p.ref;
        });
        
        cb = cb || function() {};
        this.lookup(propertyRefs, function(err, res, refs) {
            if (err) {
                console.error('problem with reqLookup');
                cb(null, handle);
                return;
            }
            
            var mirror,
                waiting = 1;
                
            if (handle.className == 'Array') {
                mirror = [];
            } else if (handle.className == 'Date') {
                mirror = new Date(handle.value);
            } else {
                mirror = {};
            }
            
            var keyValues = [];
            handle.properties.forEach(function(prop, i) {
                var value = res[prop.ref];
                var mirrorValue;
                if (value) {
                    mirrorValue = value.value ? value.value : value.text;
                } else {
                    mirrorValue = '[?]';
                }
                
                if (Array.isArray(mirror) && typeof prop.name != 'number') {
                    // Skip the 'length' property.
                    return;
                }
                
                keyValues[i] = {
                    name: prop.name,
                    value: mirrorValue
                };
                if (value && value.handle && depth > 0) {
                    waiting++;
                    self.mirror(value, depth - 1, function(err, result) {
                        if (!err) keyValues[i].value = result;
                        waitForOthers();
                    });
                }
            });
            
            waitForOthers();
            function waitForOthers() {
                if (--waiting === 0 && cb) {
                    keyValues.forEach(function(kv) {
                        mirror[kv.name] = kv.value;
                    });
                    cb(null, mirror);
                }
            };
        });
        return;
    } else if (handle.type === 'function') {
        val = function() {};
    } else if (handle.type === 'null') {
        val = null;
    } else if (handle.value !== undefined) {
        val = handle.value;
    } else if (handle.type === 'undefined') {
        val = undefined;
    } else {
        val = handle;
    }
    process.nextTick(function() {
        cb(null, val);
    });
};

DebugTranslator.prototype.onBreak = function(cb) {
    cb = cb || function() {};
    this.client.on("break", function(data) {
        cb(data);
    });
};

DebugTranslator.prototype.onException = function(cb) {
    cb = cb || function() {};
    this.client.on("exception", function(data) {
        cb(data);
    });
};

