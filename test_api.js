const http = require('http');

const data = JSON.stringify({
  // No body needed for bounds, it uses Supabase
});

const req = http.request({
  host: '127.0.0.1',
  port: 3000,
  path: '/api/tax/bounds',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // We don't have a valid supabase token for testing this way
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
