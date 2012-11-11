var dnode = require('dnode');
var server = dnode({
        transform : function (s, cb) {
            setInterval(function() {
                cb("Hi");
            }, 100);
        }
});
server.listen(5004);
