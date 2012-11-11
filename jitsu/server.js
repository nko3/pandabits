var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(301, {'Location': 'http://nodbg.com'});
  res.end();
}).listen(process.env.PORT || 80);