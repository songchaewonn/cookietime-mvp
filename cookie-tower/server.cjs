const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const appMode = process.argv.includes('--app');
const root = appMode ? path.resolve(__dirname, '..') : __dirname;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  if (req.url === '/' && !appMode) { res.writeHead(302, { Location: '/cookie-tower/' }); res.end(); return; }
  let url;
  try { url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  if (!appMode && !url.startsWith('/cookie-tower/')) { res.writeHead(404); res.end('Not found'); return; }
  let file = path.resolve(root, '.' + (appMode ? url : url.slice('/cookie-tower'.length)));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    const body = fs.readFileSync(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
const port = Number(process.env.PORT) || 4173;
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}/${appMode ? '' : 'cookie-tower/'}`));
