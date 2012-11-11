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
    // process._debugProcess(pid);
    
    this.broken = false;
};

DebugTranslator.prototype.isRunning = function() {
    return this.client.isRunning();
}

DebugTranslator.prototype.connect = function(cb) {        
    this.sock = net.connect(this.port, '127.0.0.1');
    
    this.service = new V8DebuggerService(this.sock);
    this.client = new V8Debugger(0, this.service);
    
    this.service.attach(0, cb || function() {});
    
    // Have to make sure we catch it at least once
    this.onBreak(function() {});
    
    return this;
};

DebugTranslator.prototype.brk = function(cb) {
    cb = cb || function() {};
    
    this.evaluateGlobal("process._debugPause();", cb);
    
    return this;
};

DebugTranslator.prototype.cont = function(cb) {
    cb = cb || function() {};
    var self = this;
    this.client.continueScript(null, null, function(res, handles, err) {self.broken = false; callbackModifier(cb)(res, handles, err);});
    
    return this;
};

DebugTranslator.prototype.stepIn = function(steps, cb) { 
    cb = cb || function() {};
    var self = this;
    this.client.continueScript("in", steps, function(res, handles, err) {self.broken = false; callbackModifier(cb)(res, handles, err);});
    return this;
};

DebugTranslator.prototype.stepOut = function(cb) {
    // Steps makes no sense to me here, but maybe it is reasonable
    cb = cb || function() {};
    var self = this;
    this.client.continueScript("out", 1, function(res, handles, err) {self.broken = false; callbackModifier(cb)(res, handles, err);});
    return this;
}

DebugTranslator.prototype.stepOver = function(steps, cb) {
    cb = cb || function() {};
    var self = this;
    this.client.continueScript("next", steps, function(res, handles, err) {self.broken = false; callbackModifier(cb)(res, handles, err);});
    return this;
}

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

DebugTranslator.prototype.evaluateAtCurrentFrame = function(expression,cb) {
    cb = cb || function() {};
    this.client.evaluate(expression, this.frame, false, null, callbackModifier(cb));
    
    return this;
};

DebugTranslator.prototype.lookup = function(handles, cb) {
    cb = cb || function() {};
    this.client.lookup(handles, false, callbackModifier(cb));
    
    return this;
};

DebugTranslator.prototype.setBreakpoint = function(file, line, cb) {
    cb = cb || function() {};
    
    // !sbp
    if (file === null && line === null && this.script) {        
        file = this.script;
        line = this.linenum || 0;
    }
    else if (!file && line && this.script) {
        // !sbp <lineno>
        line = parseInt(line) - 1;
        file = this.script;
    }
    
    var that = this;
    this.findFiles(file, function(err, fullPath) {
        if (err) {
            cb(err);
            return;
        }
        
        that.client.setbreakpoint("script", fullPath, line, 0, true, null, 0, function(resp) {
            if (resp && resp.breakpoint) {
                that.breakpoints[fullPath + ":" + line] = resp.breakpoint;
            }
            
            callbackModifier(cb).apply(null, arguments);
        });
    });
    
    return this;
};

DebugTranslator.prototype.removeBreakpoint = function(file, line, cb) {        
    cb = cb || function() {};
    
    var that = this;
    this.findFiles(file, function(err, fullPath) {
        if (err) {
            cb(err);
            return;
        }
        
        breakpoint = that.breakpoints[fullPath + ":" + line];
        that.removeBreakpointById(breakpoint, cb);
    });
    
    return this;
};

DebugTranslator.prototype.removeBreakpointById = function(breakpoint, cb) {        
    cb = cb || function() {};
    breakpoint = parseInt(breakpoint);
    
    var that = this;
    this.client.clearbreakpoint(breakpoint, callbackModifier(cb));
    
    var chosenKey = null;
    _.each(this.breakpoints, function(val, key) {
        if (parseInt(val) === breakpoint) {
            chosenKey = key;
        }
    });
    delete this.breakpoints[chosenKey];
    
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
        breakpoint = file;
    }
    
    cb = cb || function() {};
    
    var that = this;
    if (breakpoint || breakpoint === 0) {
        this.client.changebreakpoint(breakpoint, true, null, 0, callbackModifier(cb));
    }
    else {
        this.findFiles(file, function(err, fullPath) {
            if (err) {
                cb(err);
                return;
            }
            
            breakpoint = that.breakpoints[fullPath + ":" + line];
            that.client.changebreakpoint(breakpoint, true, null, 0, callbackModifier(cb));
        });
    }
    
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
        breakpoint = file;
    }
    
    cb = cb || function() {};
    
    var that = this;
    if (breakpoint || breakpoint === 0) {
        this.client.changebreakpoint(breakpoint, false, null, 0, callbackModifier(cb));
    }
    else {
        this.findFiles(file, function(err, fullPath) {
            if (err) {
                cb(err);
                return;
            }
            
            breakpoint = that.breakpoints[fullPath + ":" + line];
            that.client.changebreakpoint(breakpoint, false, null, 0, callbackModifier(cb));
        });
    }
    
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
            cb(new Error("No frames!"));
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

DebugTranslator.prototype.loadFiles = function(file, cb) {
    if (!cb && _.isFunction(file)) {
        cb = file;
        file = null;
    }
    
    cb = cb || function() {};  
    
    var that = this;
    if (!file) {
        this.scripts(cb);
    }
    else {
        this.findFiles(file, function(err, path, file) {
            if (err) {
                cb(err);
                return;
            } 
            
            cb(null, [file]);
        });
    }
    
    return this;
};


DebugTranslator.prototype.findFiles = function(file, cb) {
    this.client.scripts(V8Debugger.NORMAL_SCRIPTS, null, true, function(res, refs, err) {
        if (err) {
            cb(err);
            return;
        }
        
        var scripts = res;
        var matches = scripts.filter(function(script) {
            var path = script.name || "";
            
            if (path && (path === file || path.indexOf(file) >= 0)) {
                return true;
            }
            else {
                return false;
            }
        });
        
        if (matches.length > 1) {
            cb("Script '" + file +"' is ambiguous. Please specify full path.");
        }
        else if (matches.length === 0) {
            cb("Script '" + file +"' not found.");
        }
        else {
            cb(null, matches[0].name, matches[0]);
        }
    });
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
        val = "[Function]";
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

DebugTranslator.prototype.setFrame = function(frame, cb) {
    cb = cb || function() {};
    self = this;
    if (!self.broken) {
        cb("Debugger is not paused.");
        return;
    }
    var recurse = function(err, trace) {
           if (!err) {
               self.allFrames = self.allFrames.concat(trace.frames);
               if (self.allFrames.length < frame) {
                   self.backtrace(self.allFrames.length + 1, self.maxFrames, recurse);
               }
               else {
                   self.frame = frame;
                   self.linenum = self.allFrames[frame].line;
                   self.text = self.allFrames[frame].sourceLineText;
                   self.script = self.allFrames[frame].script.name;
                   cb(null, {'line': self.linenum, 'text': self.text, 'script': self.script, 'frame': frame});
               }
           }
           else {
               cb("Error occurred while trying to set frame");
               return
           }
    };
    if (frame < self.maxFrames) {
        if (self.allFrames.length < frame) {
            self.backtrace(self.allFrames.length + 1, self.maxFrames, recurse);
        }
        else {
            self.frame = frame;
            self.linenum = self.allFrames[frame].line;
            self.text = self.allFrames[frame].sourceLineText;
            self.script = self.allFrames[frame].script.name;
            cb(null, {'line': self.linenum, 'text': self.text, 'script': self.script, 'frame': frame});
        }
    }
    else {
        cb("Frame '" + frame + "' does not exist.");
    }
}

DebugTranslator.prototype.onBreak = function(cb) {    
    cb = cb || function() {};
    var self = this;
    this.client.on("break", function(data) {
        self.broken = true;
        self.linenum = data.data.sourceLine;
        self.text = data.data.sourceLineText;
        if (data.data.script) {
            self.script = data.data.script.name;
        }
        self.backtrace(function(err, trace) {
            if (!err) {
                self.frame = 0;
                self.maxFrames = trace.totalFrames;
                self.allFrames = trace.frames;
            }
            
            self.lastBreak = data;
            
            cb(data);
        });
        
        if (!self.patched) {
            self.fixRemoteStdout(self.outPort, self.errPort);
        }
    });
};

DebugTranslator.prototype.onException = function(cb) {
    cb = cb || function() {};
    this.client.on("exception", function(data) {
        cb(data);
    });
};

DebugTranslator.prototype.fixStdout = function(cb) {
    cb = cb || function() {};
    code = '(function() {var fs = require("fs"); var f = fs.openSync("tmp","w"); ' + 
            'process.stdout.write = (function (write) {return function(string, encoding, fd) {fs.writeSync(f, string); write.call(process.stdout, string, encoding, fd);}})(process.stdout.write);'+
            'process.stderr.write = (function (write) {return function(string, encoding, fd) {fs.writeSync(f, string); write.call(process.stderr, string, encoding, fd);}})(process.stderr.write);'+
            '})()';
    this.evaluateAtFrame(code, this.maxFrames - 1, cb);
};

DebugTranslator.prototype.fixRemoteStdout = function(outPort, errPort, cb) {
    cb = cb || function() {};
    
    if (this.patched) {
        cb(null);
    }
    
    this.outPort = outPort;
    this.errPort = errPort;
    this.patched = true;
    code = '(function() {' +
            'var net = require("net"); var outS = net.connect(' + JSON.stringify(outPort) + '); var errS = net.connect(' + JSON.stringify(errPort) + ');' + 
            'process.stdout.write = (function (write) {return function(string, encoding, fd) {outS.write(string); write.call(process.stdout, string, encoding, fd);}})(process.stdout.write);'+
            'process.stderr.write = (function (write) {return function(string, encoding, fd) {errS.write(string); write.call(process.stderr, string, encoding, fd);}})(process.stderr.write);'+
            '})()';

    var self = this;
    this.evaluateAtFrame(code, this.maxFrames - 1, function(err) {
        if (!err) {
            self.patched = true;
        }
        else {
            self.patched = false;
        }
    });
};
