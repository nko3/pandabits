process.stdout.write = (function(write) {
    var fs = require('fs');
    var f = fs.openSync("/Users/ineeman/Desktop/tmp.out","w");
    
    return function(string, encoding, fd) {
        fs.writeSync(f, string, encoding);
        write.call(process.stdout, string, encoding, fd);
    }
})(process.stdout.write);

console.log("BOO");