// A translation from _debug to maybe something saner?
var debug = require('_debugger');
var assert = require('assert');

// The debugTranslator object, just a simple shim over _debugger. Supplied with
// a PID, it attempts to create a client for this PID.
exports.debugTranslator = function (pid) {
    this.pid = pid;
    process._debugProcess(pid);
    this.client = new debug.Client();
    this.connected = false;
}

// The debugger module uses -1 to represent the global scope. They don't however
// export this value. We just follow this behavior.
var NO_FRAME = -1;

// Actually connect to the process.
exports.debugTranslator.prototype.connect = function(cb) {
    this.client.connect(debug.port);
    this.client.on('ready', function() {
        this.connected = true
        cb = cb || function() {};
        cb();
    });
}

// Break into the current execution context
exports.debugTranslator.prototype.break_ = function(cb) {
    assert(this.client.connected);
    this.client.reqFrameEval('process._debugPause()', NO_FRAME, cb);
}

// Execute a statement in the node instances global context. This could for instance
// be used to redirect stdout and stderr.
// Code is a string
exports.debugTranslator.prototype.execGlobal= function (code, cb) {
    assert(this.client.connected);
    this.client.reqFrameEval(code, NO_FRAME, cb);
}

// Continue execution. 
exports.debugTranslator.prototype.cont = function (cb) {
    assert(this.client.connected);
    cb = cb || function() {};
    this.client.reqContinue(cb);
}

// Break on exceptions. If all is false, only catch uncaught exceptions
exports.debugTranslator.prototype.enableExceptionBreak = function (all, cb) {
    assert(this.client.connected);
    all = all && 'all';
    all = all || 'uncaught';
    cb = cb || function() {};
    this.client.reqSetExceptionBreak(all, cb);
}

// Disable break on exceptions. If all is false, only uncatch uncaught exceptions
exports.debugTranslator.prototype.disableExceptionBreak = function (all, cb) {
    assert(this.client.connected);
    all = all && 'all';
    all = all || 'uncaught';
    cb = cb || function () {};
    this.client.req({command: 'setexceptionbreak', arguments: {type: all, enabled: false}}, cb)
}

// Get stack trace (or rather get a list of frames, the frames still need to be interpreted
// and printed, but what the hell
// This inconsistently takes an object instead of the usual callback thing. Mostly this was
// because this thing had too many possible options that seemed useful. Things the object
// can contain:
// fromFrame: int
// toFrame: Int
// bottom: bool <- Get the bottom of the stack trace
exports.debugTranslator.prototype.backtrace = function(obj, cb) {
    assert(this.client.connected);
    this.client.req({command: 'backtrace', arguments: obj}, function(err, resp) {
        if (err || !resp.frames) {
            cb(null);
            return;
        }
        cb(resp.frames);
    });
}
