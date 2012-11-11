var DebugTranslator = require('./translator');
var net = require('net');
var dnode = require('dnode')
var Connector = module.exports = function(remote_ip, remote_port, local_pid, local_port) {
    var self = this;
    self.sock = net.connect(remote_port, remote_ip,  function() {
        self.translator = new DebugTranslator(local_pid, local_port);
        self.d = dnode({
            connect : function (cb) {
                self.translator.connect(function () {cb(true);});
            },
            cont : function (cb) {
                self.translator.cont(cb);
            },
            brk : function (cb) {
                self.translator.brk(cb);
            },
            stepIn : function(steps, cb) { 
                self.translator.stepIn(steps, cb);
            },
            stepOut : function(cb) {
                self.translator.stepOut(cb);
            },
            stepOver : function(steps, cb) {
                self.translator.stepOver(steps, cb);
            },
            evaluateGlobal: function(expr, cb) {
                self.translator.evaluateGlobal(expr, cb);
            },
            evaluateAtFrame: function(expr, frame, cb) {
                self.translator.evaluateAtFrame(expr, frame, cb);
            },
            evaluateAtCurrentFrame: function(expr, cb) {
                self.translator.evaluateAtCurrentFrame(expr, cb);
            },
            lookup: function(handles, cb) {
                self.translator.lookup(handles, cb);
            },
            setBreakpoint: function(file, line, cb) {
                self.translator.setBreakpoint(file, line, cb);
            },
            removeBreakpoint: function(file, line, cb) {
                self.translator.removeBreakpoint(file, line, cb);
            },
            removeBreakpointById: function(bp, cb) {
                self.translator.removeBreakpointById(bp, cb);
            },
            enableBreakpoint: function(file, line, cb) {
                self.translator.enableBreakpoint(file, line, cb);
            },
            disableBreakpoint: function(file, line, cb) {
                self.translator.disableBreakpoint(file, line, cb);
            },
            listBreakpoints: function(cb) {
                self.translator.listBreakpoints(cb);
            },

            enableBreakOnException: function(all, cb) {
                self.translator.enableBreakOnException(all, cb);
            },

            disableBreakOnException: function(cb) {
                self.translator.enableBreakOnException(cb);
            },

            backtrace : function(from, to, bottom, cb) {
                self.translator.backtrace(from, to, bottom, cb);
            },

            scripts : function(cb) {
                self.translator.scripts(cb);
            },

            loadFiles: function(file, cb) {
                self.translator.loadFiles(file, cb);
            },
            findFiles : function(file, cb) {
                self.translator.findFiles(file, cb);
            },
            mirror : function(handle, depth, cb) {
                self.translator.mirror(handle, depth, cb);
            },
            setFrame : function(frame, cb) {
                self.translator.setFrame(frame, cb);
            },

            onBreak : function(cb) {
                self.translator.onBreak(cb);
            },

            onException : function(cb) {
                self.translator.onException(cb);
            },

            fixStdout : function(outCb, errCb, cb) {
                var net = require('net');
                var outServer = net.createServer(function(c) { 
                    c.on('data', function(data) {
                        outCb(data.toString());
                    });
                });
                var errServer = net.createServer(function(c) { 
                    c.on('data', function(data) {
                        errCb(data.toString());
                    });
                });
                outServer.listen('/tmp/'+local_pid+'.out');
                errServer.listen('/tmp/'+local_pid+'.err');
                self.translator.fixRemoteStdout({path: '/tmp/'+local_pid+'.out'}, {path:'/tmp/'+local_pid+'.err'}, cb);
            },
            frame : function(cb) {
                cb(self.translator.frame);
            },
            broken: function(cb) {
                cb(self.translator.broken);
            },
            lastBreak: function(cb) {
                cb(self.translator.lastBreak);
            }
        });
        self.sock.pipe(self.d).pipe(self.sock);
    });
};
