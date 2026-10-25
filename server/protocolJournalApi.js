import fs from 'node:fs';
import path from 'node:path';

const JOURNAL_FILES = {
  success: 'successful-protocol-journal.txt',
  failure: 'unsuccessful-protocol-journal.txt',
};

function readEntries(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

export function protocolJournalApi(directory) {
  fs.mkdirSync(directory, { recursive: true });
  const filePath = kind => path.join(directory, JOURNAL_FILES[kind]);

  return {
    name: 'protocol-journal-api',
    configureServer(server) {
      server.middlewares.use('/api/protocol-journal', (request, response, next) => {
        const url = new URL(request.url, 'http://journal.local');
        const kind = url.pathname.replace(/^\//, '');

        if (request.method === 'GET' && !kind) {
          try {
            sendJson(response, 200, {
              successes: readEntries(filePath('success')),
              failures: readEntries(filePath('failure')),
            });
          } catch (error) {
            sendJson(response, 500, { error: error.message });
          }
          return;
        }

        if (request.method !== 'POST' || !JOURNAL_FILES[kind]) {
          next();
          return;
        }

        let body = '';
        request.setEncoding('utf8');
        request.on('data', chunk => {
          body += chunk;
          if (body.length > 100_000) request.destroy();
        });
        request.on('end', () => {
          try {
            const entry = JSON.parse(body);
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Invalid journal entry');
            fs.appendFileSync(filePath(kind), `${JSON.stringify(entry)}\n`, 'utf8');
            sendJson(response, 201, { ok: true });
          } catch (error) {
            sendJson(response, 400, { error: error.message });
          }
        });
        request.on('error', error => sendJson(response, 400, { error: error.message }));
      });
    },
  };
}
