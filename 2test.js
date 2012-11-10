var spawn = require('child_process').spawn;

debuggee = spawn('node', ['test/test.js']);
debuggee.on("exit", function() {
  console.log("CHILD EXITED");
})

debuggee.stdout.on('data', function (data) {
  console.log('stdout: ' + data);
});

debuggee.stderr.on('data', function (data) {
  console.log('stderr: ' + data);
});

process.on("exit", function() {
  debuggee.kill();
});

process.foo = "HELLO WORLD";
process.bar = "bar";

var DebugTranslator = require('./lib/translator');
var translator = new DebugTranslator(debuggee.pid, 5858);

var counter = 0;
var onConnect = function(err, resp) {
  translator.onBreak(function() {
    console.log("BREAK");
    translator.evaluateGlobal('console.log("hi")', function(err, res) {
      translator.mirror(res, 3, function(err, res) {
        console.log(res);
      });
    });
  })
};

translator.connect(onConnect)
  .setBreakpoint('/Users/ineeman/Work/pandabits/test/test.js', 3, function(err, resp) {
    console.log("BP1", err, resp);
  })
  .setBreakpoint('/Users/ineeman/Work/pandabits/test/test.js', 7, function(err, resp) {
    console.log("BP2", err, resp);
  });
  
