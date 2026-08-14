const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'POST' && req.url === '/__error') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      console.log('Received error:', body);
      fs.writeFileSync('error_log.json', body);
      res.end('ok');
    });
  } else {
    res.end('ok');
  }
});

server.listen(3001, () => {
  console.log('Error logger listening on 3001');
});
