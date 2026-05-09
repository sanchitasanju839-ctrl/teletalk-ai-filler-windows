const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json());

const MAIN_SERVICE = 'teletalk-ai-filler.service';
const PORT = 3001;

function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 15000 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: error?.code ?? 0,
        stdout: (stdout || '').trim(),
        stderr: (stderr || '').trim()
      });
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pingBackend() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:3000/', (res) => {
      resolve(res.statusCode && res.statusCode >= 200 && res.statusCode < 500);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitBackendUp(maxMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const ok = await pingBackend();
    if (ok) return true;
    await sleep(500);
  }
  return false;
}

async function serviceState() {
  const enabled = await run(`systemctl --user is-enabled ${MAIN_SERVICE}`);
  const active = await run(`systemctl --user is-active ${MAIN_SERVICE}`);
  const listen = await run("ss -ltnp '( sport = :3000 )' | tail -n +2");

  return {
    service: MAIN_SERVICE,
    enabled: enabled.ok ? enabled.stdout : enabled.stderr || 'unknown',
    active: active.ok ? active.stdout : active.stderr || 'inactive',
    port3000: listen.stdout || ''
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: MAIN_SERVICE });
});

app.get('/status', async (_req, res) => {
  const state = await serviceState();
  res.json({ ok: true, ...state });
});

app.post('/start', async (_req, res) => {
  const out = await run(`systemctl --user start ${MAIN_SERVICE}`);
  const backendUp = await waitBackendUp();
  const state = await serviceState();
  res.json({ ok: out.ok && backendUp, action: 'start', out, backendUp, state });
});

app.post('/stop', async (_req, res) => {
  const out = await run(`systemctl --user stop ${MAIN_SERVICE}`);
  const state = await serviceState();
  res.json({ ok: out.ok, action: 'stop', out, state });
});

app.post('/restart', async (_req, res) => {
  const out = await run(`systemctl --user restart ${MAIN_SERVICE}`);
  const backendUp = await waitBackendUp();
  const state = await serviceState();
  res.json({ ok: out.ok && backendUp, action: 'restart', out, backendUp, state });
});

app.post('/fix-port', async (_req, res) => {
  const pids = await run('lsof -ti :3000');
  let killOut = { ok: true, stdout: 'no process', stderr: '' };

  if (pids.stdout) {
    const list = pids.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
    if (list.length) {
      killOut = await run(`kill -9 ${list.join(' ')}`);
    }
  }

  const restartOut = await run(`systemctl --user restart ${MAIN_SERVICE}`);
  const backendUp = await waitBackendUp();
  const state = await serviceState();

  res.json({
    ok: restartOut.ok && backendUp,
    action: 'fix-port',
    killed: pids.stdout || '',
    killOut,
    restartOut,
    backendUp,
    state
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Teletalk controller running on http://127.0.0.1:${PORT}`);
});
