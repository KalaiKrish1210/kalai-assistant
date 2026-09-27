const fs = require('fs');
const path = require('path');

function forwardAuth(proxyReq, req) {
  const authorization = req.headers.authorization;
  if (authorization) {
    proxyReq.setHeader('Authorization', authorization);
  }
  const googleKey = req.headers['x-goog-api-key'];
  if (googleKey) {
    proxyReq.setHeader('x-goog-api-key', googleKey);
  }
}

module.exports = {
  '/llm/ollama': {
    target: 'http://127.0.0.1:11434',
    secure: false,
    changeOrigin: true,
    pathRewrite: {
      '^/llm/ollama': '',
    },
  },
  '/llm/gemini': {
    target: 'https://generativelanguage.googleapis.com',
    secure: true,
    changeOrigin: true,
    pathRewrite: {
      '^/llm/gemini': '',
    },
  },
  '/llm/grok': {
    target: 'https://api.x.ai',
    secure: true,
    changeOrigin: true,
    pathRewrite: {
      '^/llm/grok': '',
    },
    configure(proxy) {
      proxy.on('proxyReq', forwardAuth);
    },
  },
  '/llm/groq': {
    target: 'https://api.groq.com',
    secure: true,
    changeOrigin: true,
    pathRewrite: {
      '^/llm/groq': '',
    },
    configure(proxy) {
      proxy.on('proxyReq', forwardAuth);
    },
  },
  '/kalai/save-properties': {
    target: 'http://127.0.0.1:9',
    bypass(req, res) {
      if (req.method !== 'POST') {
        return false;
      }

      return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('error', reject);
        req.on('end', () => {
          try {
            const file = path.join(__dirname, 'public', 'kalai.properties');
            fs.writeFileSync(file, Buffer.concat(chunks).toString('utf8'), 'utf8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: file }));
            resolve('/kalai.properties');
          } catch (error) {
            reject(error);
          }
        });
      });
    },
  },
};
