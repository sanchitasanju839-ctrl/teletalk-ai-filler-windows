const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
let backendProcess = null;

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

async function waitBackendUp(maxMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const ok = await pingBackend();
    if (ok) return true;
    await sleep(1000);
  }
  return false;
}

async function serviceState() {
  // Check if port 3000 is listening on Windows
  const listen = await run('netstat -ano | findstr :3000 | findstr LISTENING');
  const active = await pingBackend();

  return {
    service: 'teletalk-ai-filler',
    enabled: 'n/a (windows)',
    active: active ? 'active' : 'inactive',
    port3000: listen.stdout || ''
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/status', async (_req, res) => {
  const state = await serviceState();
  res.json({ ok: true, ...state });
});

app.post('/start', async (_req, res) => {
  if (await pingBackend()) {
     return res.json({ ok: true, action: 'start', message: 'Already running' });
  }

  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  backendProcess = spawn(npmCmd, ['start'], {
    cwd: __dirname,
    detached: true,
    stdio: 'ignore'
  });
  backendProcess.unref();

  const backendUp = await waitBackendUp();
  const state = await serviceState();
  res.json({ ok: backendUp, action: 'start', backendUp, state });
});

app.post('/stop', async (_req, res) => {
  // Kill process on port 3000
  const findPort = await run('netstat -ano | findstr :3000 | findstr LISTENING');
  if (findPort.stdout) {
    const lines = findPort.stdout.split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) {
        await run(	askkill /F /PID  + pid);
      }
    }
  }
  const state = await serviceState();
  res.json({ ok: true, action: 'stop', state });
});

app.post('/restart', async (_req, res) => {
  await run('netstat -ano | findstr :3000').then(async (out) => {
      if (out.stdout) {
          const pid = out.stdout.trim().split(/\s+/).pop();
          if (pid) await run(	askkill /F /PID  + pid);
      }
  });
  
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  spawn(npmCmd, ['start'], { cwd: __dirname, detached: true, stdio: 'ignore' }).unref();
  
  const backendUp = await waitBackendUp();
  const state = await serviceState();
  res.json({ ok: backendUp, action: 'restart', backendUp, state });
});

app.post('/fix-port', async (_req, res) => {
  const findPort = await run('netstat -ano | findstr :3000');
  if (findPort.stdout) {
    const pid = findPort.stdout.trim().split(/\s+/).pop();
    if (pid) await run(	askkill /F /PID  + pid);
  }
  
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  spawn(npmCmd, ['start'], { cwd: __dirname, detached: true, stdio: 'ignore' }).unref();
  
  const backendUp = await waitBackendUp();
  const state = await serviceState();
  res.json({ ok: backendUp, action: 'fix-port', backendUp, state });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log('Teletalk controller running on http://127.0.0.1:' + PORT);
});
