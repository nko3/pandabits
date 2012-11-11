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

setTimeout(function() {
var DebugTranslator = require('./lib/translator');
var translator = new DebugTranslator(debuggee.pid, 5858);

//console.log("STARTING OUT");

var printTrace = function() {
    translator.backtrace(function(err, trace) {
      if (err) {
        console.log("err", err);
        return;
      }
      
      var frames = trace.frames.map(function(frame) {
        return "  " + frame.script.name + ":" + frame.line;
      })
      
      console.log("Trace: " + "\n" + frames.join("\n"));
    });
}

  var counter = 0;
  var onConnect = function(err, resp) {
    console.log("CONNECT");
    console.log(translator.isRunning());
    
    //thing 1
    translator
      .setBreakpoint('/Volumes/code/code/pandabits/test/test.js', 4, function(err, resp) {
        console.log("BP1", err, resp);
      })
    
    translator.onBreak(function(data) {
        console.log("BREAK " + counter, data.data);
        counter = counter + 1;
        //printTrace();
        console.log(translator.broken, translator.linenum, translator.script, translator.frame, translator.maxFrames);
        if (counter == 1) {
             translator.fixStdout(function(err, resp) {console.log("stdout ", err, resp);});
             translator.cont();
        }
        else {
            translator.setFrame(translator.frame + 1, function(err, data) {
                console.log("SetFrame ", err, data);
            });
            translator.cont();
        }
        console.log(translator.broken, translator.linenum, translator.script, translator.frame, translator.maxFrames);
          
      });
      //translator.stepIn(1, function(err, res) {console.log("step", err, res);});
    translator.scripts(function(err, res) {
      var names = res.map(function(script) {
        return script.name;
      })
      
      console.log(names);
    });
    //thing 3
    //printTrace(); 
    
    // thing 2
    /*translator.evaluateGlobal('console.log("hi"); 1+1', function(err, res) {
      console.log("args", err, res);
      translator.mirror(res, 3, function(err, res) {
        console.log("GO", res);
      });
    });*/
  };
  
  translator.connect(onConnect);
  //onConnect();
}, 1000); 
