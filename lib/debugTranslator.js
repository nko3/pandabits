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
    this.client.suspend(cb);
}

// Execute a statement in the node instances global context. This could for instance
// be used to redirect stdout and stderr.
// Code is a string
exports.debugTranslator.prototype.evaluateGlobal = function (code, cb) {
    this.client.evaluate(code, null, true, null, cb);
}

exports.debugTranslator.prototype.evaluate = function (code, frame, cb) {
    this.client.evaluate(code, frame, false, null, cb);
}

exports.debugTranslator.prototype.lookup = function (handles, cb) {
    this.client.lookup(handles, false, cb);
}

exports.debugTranslator.prototype.setBreakpoint = function (file, line, cb) {
    this.client.setbreakpoint("script", file, line, 0, true, null, 0, cb);
}

// Continue execution. 
exports.debugTranslator.prototype.cont = function (cb) {
    this.client.continueScript(null, null, cb);
}

exports.debugTranslator.prototype.scripts = function(cb) {
    this.client.scripts(debug.NORMAL_SCRIPTS, null, true, cb);
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
    //assert(this.client.connected);
    cb = cb || function () {};
    this.client.setExceptionBreak("", cb);
}

exports.debugTranslator.prototype.onBreak = function(cb) {
	this.client.on("break", function(data) {
		cb(data);
	});
};

// Get stack trace (or rather get a list of frames, the frames still need to be interpreted
// and printed, but what the hell
// This inconsistently takes an object instead of the usual callback thing. Mostly this was
// because this thing had too many possible options that seemed useful. Things the object
// can contain:
// fromFrame: int
// toFrame: Int
// bottom: bool <- Get the bottom of the stack trace
exports.debugTranslator.prototype.backtrace = function(obj, cb) {
    //assert(this.client.connected);
    this.client.backtrace(obj.fromFrame, obj.toFrame, obj.bottom, null, cb);
}

exports.debugTranslator.prototype.mirrorObject = function(handle, depth, cb) {
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
    this.lookup(propertyRefs, function(res, refs, err) {
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


        if (Array.isArray(mirror) &&
            typeof prop.name != 'number') {
          // Skip the 'length' property.
          return;
        }

        keyValues[i] = {
          name: prop.name,
          value: mirrorValue
        };
        if (value && value.handle && depth > 0) {
          waiting++;
          self.mirrorObject(value, depth - 1, function(err, result) {
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
