/* Mahalliy ishlab chiqish serveri: public/ statik fayllari + api/*.js funksiyalari
   (Vercel'dagi kabi). Savollar .data/bank.json ga yoziladi.
   Ishga tushirish: npm run dev  ->  http://localhost:3000 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

process.env.ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const api = url.pathname.match(/^\/api\/([a-z-]+)$/);
  if (api) {
    const file = path.join(ROOT, 'api', api[1] + '.js');
    if (fs.existsSync(file)) return require(file)(req, res);
    res.statusCode = 404;
    return res.end('{"error":"topilmadi"}');
  }
  let file = path.normalize(path.join(PUBLIC, decodeURIComponent(url.pathname)));
  if (!file.startsWith(PUBLIC)) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('Topilmadi'); }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`http://localhost:${PORT}  (login: ${process.env.ADMIN_LOGIN})`));
