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

var DebugTranslator = require('./lib/debugTranslator').debugTranslator;
var translator = new DebugTranslator(debuggee.pid);
translator.connect(function() {
  console.log("CONNECTED", arguments);
  setTimeout(function() {
    translator.execGlobal("console", function(err, resp) {
      console.log(err, resp);
    })
  }, 1000);
});