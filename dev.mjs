// Τοπικός server για δοκιμές: node dev.mjs  ->  http://localhost:3000
// Στο Vercel δεν χρησιμοποιείται· εκεί τα api/*.js γίνονται serverless functions.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const PORT = Number(process.env.PORT) || 3000;
createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  try {
    const api = path.match(/^\/api\/([a-z]+)$/);
    if (api && existsSync(`api/${api[1]}.js`)) {
      const mod = await import(`./api/${api[1]}.js`);
      return await mod.default(req, res);
    }
    if (path === '/' || path === '/index.html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(readFileSync('index.html'));
    }
    res.statusCode = 404;
    res.end('Not found');
  } catch (e) {
    res.statusCode = 500;
    res.end(String(e));
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
