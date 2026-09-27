const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { URL } = require('url');

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const PROXIES = {
  '/llm/gemini': 'https://generativelanguage.googleapis.com',
  '/llm/grok': 'https://api.x.ai',
  '/llm/groq': 'https://api.groq.com',
  '/llm/ollama': 'http://127.0.0.1:11434',
};

const HOP_BY_HOP = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

function propertiesPath(userDataDir) {
  return path.join(userDataDir, 'kalai.properties');
}

function seedProperties(userDataDir, packaged) {
  const dest = propertiesPath(userDataDir);
  if (fs.existsSync(dest) || packaged) {
    return;
  }
  const source = path.join(__dirname, '..', 'public', 'kalai.properties');
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
  }
}

function send(res, status, body, headers = {}) {
  const payload = Buffer.from(body);
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': payload.length,
    ...headers,
  });
  res.end(payload);
}

function sendJson(res, status, value) {
  send(res, status, JSON.stringify(value), { 'Content-Type': 'application/json; charset=utf-8' });
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function copyHeaders(source) {
  const headers = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && !HOP_BY_HOP.has(key.toLowerCase())) {
      headers[key] = value;
    }
  }
  return headers;
}

function proxyRequest(req, res, prefix, origin) {
  const incoming = new URL(req.url, 'http://127.0.0.1');
  const target = new URL(incoming.pathname.replace(prefix, '') || '/', origin);
  target.search = incoming.search;
  const transport = target.protocol === 'https:' ? https : http;
  const headers = copyHeaders(req.headers);
  headers.host = target.host;
  if (req.headers['content-length']) {
    headers['content-length'] = req.headers['content-length'];
  }
  if (req.headers['content-type']) {
    headers['content-type'] = req.headers['content-type'];
  }

  const proxyReq = transport.request(
    target,
    { method: req.method, headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, copyHeaders(proxyRes.headers));
      proxyRes.pipe(res);
    },
  );
  proxyReq.on('error', () => {
    if (!res.headersSent) {
      send(res, 502, 'The model service is not reachable.');
    } else {
      res.destroy();
    }
  });
  req.pipe(proxyReq);
}

function safeStaticPath(webRoot, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const resolved = path.normalize(path.join(webRoot, relative));
  if (!resolved.startsWith(webRoot)) {
    return null;
  }
  return resolved;
}

function serveStatic(req, res, webRoot) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method not allowed');
    return;
  }
  const requested = safeStaticPath(webRoot, req.url ?? '/');
  if (!requested) {
    send(res, 403, 'Forbidden');
    return;
  }
  const file = fs.existsSync(requested) && fs.statSync(requested).isFile()
    ? requested
    : path.join(webRoot, 'index.html');
  const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(file).pipe(res);
}

function startDesktopServer({ userDataDir, webRoot, packaged = false }) {
  seedProperties(userDataDir, packaged);
  const file = propertiesPath(userDataDir);

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = req.url ?? '/';
      if (url.split('?')[0] === '/kalai.properties' && req.method === 'GET') {
        if (!fs.existsSync(file)) {
          send(res, 404, '');
          return;
        }
        send(res, 200, fs.readFileSync(file, 'utf8'), {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        return;
      }

      if (url.split('?')[0] === '/kalai/save-properties' && req.method === 'POST') {
        void collectBody(req)
          .then((body) => {
            fs.mkdirSync(userDataDir, { recursive: true });
            fs.writeFileSync(file, body.toString('utf8'), 'utf8');
            sendJson(res, 200, { ok: true, path: file });
          })
          .catch(() => sendJson(res, 500, { ok: false }));
        return;
      }

      const prefix = Object.keys(PROXIES).find((key) => url.startsWith(key));
      if (prefix) {
        proxyRequest(req, res, prefix, PROXIES[prefix]);
        return;
      }

      serveStatic(req, res, webRoot);
    });

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        server,
        port,
        url: `http://127.0.0.1:${port}/`,
        propertiesFile: file,
      });
    });
  });
}

module.exports = { startDesktopServer, propertiesPath };
