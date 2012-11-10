// A translation from _debug to maybe something saner?
var debug = require('v8debug').V8Debugger;
var debug_service = require('v8debug').StandaloneV8DebuggerService;
var PORT = require('_debugger').port;
console.log(PORT)
var net = require('net');
var assert = require('assert');

// The debugTranslator object, just a simple shim over _debugger. Supplied with
// a PID, it attempts to create a client for this PID.
exports.debugTranslator = function (pid) {
    this.pid = pid;
    process._debugProcess(pid);
    this.sock = net.connect(PORT, '127.0.0.1');
    this.service = new debug_service(this.sock);
    this.client = new debug(0, this.service);
    this.connected = true;
}

// The debugger module uses -1 to represent the global scope. They don't however
// export this value. We just follow this behavior.
var NO_FRAME = -1;

// Actually connect to the process.
exports.debugTranslator.prototype.connect = function(cb) {
    this.service.attach(0, cb || function() {});
}

// Break into the current execution context
exports.debugTranslator.prototype.break_ = function(cb) {
    this.client.evaluate('process._debugPause()', null, true, null, cb);
}

// Execute a statement in the node instances global context. This could for instance
// be used to redirect stdout and stderr.
// Code is a string
exports.debugTranslator.prototype.execGlobal= function (code, cb) {
    this.client.evaluate(code, null, true, null, cb);
}

// Continue execution. 
exports.debugTranslator.prototype.cont = function (cb) {
    this.client.continueScript(null, null, cb);
}

// Break on exceptions. If all is false, only catch uncaught exceptions
exports.debugTranslator.prototype.enableExceptionBreak = function (all, cb) {
    all = all && 'all';
    all = all || 'uncaught';
    cb = cb || function() {};
    this.client.setExceptionBreak(all, cb);
}

// Disable break on exceptions. If all is false, only uncatch uncaught exceptions
exports.debugTranslator.prototype.disableExceptionBreak = function (cb) {
    assert(this.client.connected);
    cb = cb || function () {};
    this.client.setExceptionBreak("", cb);
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
    this.client.backtrace(obj.fromFrame, obj.toFrame, obj.bottom, null, cb);
}
