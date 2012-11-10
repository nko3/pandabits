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

var DebugTranslator = require('./lib/debugTranslator').debugTranslator;
var translator = new DebugTranslator(debuggee.pid);
translator.connect(function() {
  console.log("CONNECTED", arguments);
  
  translator.setBreakpoint('/Users/ineeman/Work/pandabits/test/test.js', 3, function() {
    //console.log(arguments);
  });
  translator.cont(function() {
    translator.onBreak(function() {
      translator.backtrace({}, function(resp, refs) {
        console.log("bt", resp);
      })
    });
  });
  
  //translator.onBreak();
  //translator.cont();
  setTimeout(function() {
      
      translator.scripts(function(scripts) {
        console.log("scripts", scripts.map(function(script) { return script.name}));
      })
      
      /*translator.break_(function(){
        console.log("BREAK", arguments);
        translator.evaluateGlobal("process.foobar", function(resp) {
          var res = resp[0];
          
          translator.mirrorObject(res, 3, function(err, res) {
            console.log("mirror", err, res);
          });
          
          translator.backtrace({}, function() {
            console.log("bt", arguments);
          })
        })
        
      });*/
  }, 1000)
});