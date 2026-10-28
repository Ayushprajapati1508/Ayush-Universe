import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const portIndex = process.argv.indexOf('--port');
const port = Number(process.env.PORT || (portIndex >= 0 ? process.argv[portIndex + 1] : 8000));
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2', '.json':'application/json', '.pdf':'application/pdf' };
http.createServer((req,res) => {
  let name;
  try { name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }
  const requested = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!requested.startsWith(root + path.sep)) { res.writeHead(403).end('Forbidden'); return; }
  fs.stat(requested, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type':mime[path.extname(requested)] || 'application/octet-stream', 'Cache-Control':'no-cache' });
    fs.createReadStream(requested).pipe(res);
  });
}).listen(port, '0.0.0.0', () => console.log(`Ayush Universe is ready at http://localhost:${port}`));
