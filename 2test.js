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

//console.log("STARTING OUT");

var printTrace = function() {
    translator.backtrace(function(err, trace) {
      var frames = trace.frames.map(function(frame) {
        return "  " + frame.script.name + ":" + frame.line;
      })
      
      console.log("Trace: " + "\n" + frames.join("\n"));
    });
}

setTimeout(function() {
  var counter = 0;
  var onConnect = function(err, resp) {
    console.log("CONNECT");
    console.log(translator.isRunning());
    
    // thing 1
    translator
      .setBreakpoint('/Users/ineeman/Work/pandabits/test/test.js', 2, function(err, resp) {
        console.log("BP1", err, resp);
      })
      .setBreakpoint('/Users/ineeman/Work/pandabits/test/test.js', 6, function(err, resp) {
        console.log("BP2", err, resp);
      });
    
    translator.onBreak(function(data) {
      console.log("BREAK", data.data);
      printTrace();
          
      translator.evaluateGlobal('console.log("hi")', function(err, res) {
        console.log("args", err, res);
        translator.mirror(res, 3, function(err, res) {
          console.log("GO", res);
        });
      });
    })
    
    //translator.cont();
    translator.scripts(function(err, res) {
      var names = res.map(function(script) {
        return script.name;
      })
      
      console.log(names);
    });
    
    // thing 3
    //printTrace(); 
    
    // thing 2
    /*translator.evaluateGlobal('console.log("hi"); 1+1', function(err, res) {
      console.log("args", err, res);
      translator.mirror(res, 3, function(err, res) {
        console.log("GO", res);
      });
    });*/
  };
  
  //translator.connect(onConnect);
  onConnect();
    
}, 1000); 