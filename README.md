# nodbg - social debugging

The easiest explanation is just to go to http://www.nodbg.com, and it will be
pretty clear from there.

## Why

We wanted to ty and make a debugger that has a couple of things:

1. The ability for multiple people to collaborate at once on the debugging. This
is a very common feature that we've used in the past, and we wanted to bring it
to node.
2. Have the ability to share the debug session outside your org - debugging as
a service, so to speak.
3. Preserve stdout/stderr streams
4. A simple debugger interface, a-la windbg.
5. In-line chat.

## node-inspector

node-inspector is awesome, and Danny did a great job on it. It was a big
inspiration for us, and we learnt a lot from the code. We did however want to
improve upon the experience, as we wanted the above features.

## windbg

windbg, Microsoft's kernel debugger, is something we were both familiar with. We
think it has a pretty good mix of developer-friendly interface/features combined
with low-level functionality, which we wanted to have in node.

# Features

Beyond the above, you can:

1. Set breakpoints on the file interface.
2. Load files (or all open files) using !loadfile.
3. Interact with the debugger both through the command line and through the 
debug toolbar buttons.
4. Chat with others using !chat.
5. Change your username.

You can also run it both locally or remotely. There are no accounts, you will
simply get a URL which you can share.

We also simplified the startup experience - you simply install, tell it which
JS file to run or which process to attach to, and off you go. No need to manage
multiple processes.

## Errors

If you see this error:
```
events.js:66
        throw arguments[1]; // Unhandled 'error' event
                       ^
Error: This socket is closed.
    at Socket._write (net.js:518:19)
    at Socket.write (net.js:510:15)
    at $send (/Users/ineeman/Work/pandabits/ext/lib-v8debug/lib/v8debug/StandaloneV8DebuggerService.js:72:22)
    at debuggerCommand (/Users/ineeman/Work/pandabits/ext/lib-v8debug/lib/v8debug/StandaloneV8DebuggerService.js:66:14)
    at $send (/Users/ineeman/Work/pandabits/ext/lib-v8debug/lib/v8debug/V8Debugger.js:296:23)
    at evaluate (/Users/ineeman/Work/pandabits/ext/lib-v8debug/lib/v8debug/V8Debugger.js:172:15)
    at DebugTranslator.evaluateGlobal (/Users/ineeman/Work/pandabits/lib/translator.js:81:17)
    at DebugTranslator.brk (/Users/ineeman/Work/pandabits/lib/translator.js:44:10)
    at module.exports.self.sock.net.connect.self.d.dnode.brk (/Users/ineeman/Work/pandabits/lib/connector.js:19:33)
    at Proto.apply (/Users/ineeman/Work/pandabits/node_modules/dnode/node_modules/dnode-protocol/index.js:123:13)
```

You may have some zombie processes. Find them with `ps aux | grep node` and kill
them all!

# Team

* Itay Neeman
* Aurojit Panda