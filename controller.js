const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const http = require('http');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

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

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function pingBackend() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:3000/', (res) => {
      resolve(res.statusCode && res.statusCode >= 200 && res.statusCode < 500);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
  });
}

async function waitBackendUp(maxMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    if (await pingBackend()) return true;
    await sleep(1000);
  }
  return false;
}

async function stopBackend() {
  const findPort = await run('netstat -ano | findstr :3000 | findstr LISTENING');
  if (findPort.stdout) {
    const lines = findPort.stdout.split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) {
        await run('taskkill /F /PID ' + pid);
      }
    }
  }
}

async function serviceState() {
  const active = await pingBackend();
  return {
    service: 'teletalk-ai-filler',
    active: active ? 'active' : 'inactive'
  };
}

app.get('/status', async (_req, res) => {
  const state = await serviceState();
  console.log(`[${new Date().toLocaleTimeString()}] Status request: ${state.active}`);
  res.json({ ok: true, ...state });
});

app.post('/start', async (_req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] Start request received`);
  
  if (await pingBackend()) {
    console.log(`[${new Date().toLocaleTimeString()}] Backend already running`);
    return res.json({ ok: true, action: 'start', state: await serviceState() });
  }
  
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Starting backend via npm...`);
    // Try npm start first
    spawn('npm.cmd', ['start'], { cwd: __dirname, detached: true, stdio: 'ignore' }).unref();
    const up = await waitBackendUp();
    
    if (!up) {
      console.log(`[${new Date().toLocaleTimeString()}] npm start failed, trying npx ts-node...`);
      // Fallback: try direct node command
      const scriptPath = path.join(__dirname, 'src', 'index.ts');
      spawn('npx', ['ts-node', scriptPath], { cwd: __dirname, detached: true, stdio: 'ignore' }).unref();
      const upRetry = await waitBackendUp();
      console.log(`[${new Date().toLocaleTimeString()}] Backend ${upRetry ? 'started' : 'failed to start'} via npx`);
      return res.json({ ok: upRetry, action: 'start', state: await serviceState() });
    }
    
    console.log(`[${new Date().toLocaleTimeString()}] Backend started successfully`);
    res.json({ ok: up, action: 'start', state: await serviceState() });
  } catch (err) {
    console.error(`[${new Date().toLocaleTimeString()}] Start error:`, err);
    res.json({ ok: false, action: 'start', error: err.message, state: await serviceState() });
  }
});

app.post('/stop', async (_req, res) => {
  await stopBackend();
  res.json({ ok: true, action: 'stop', state: await serviceState() });
});

app.post('/restart', async (_req, res) => {
  try {
    await stopBackend();
    await new Promise((r) => setTimeout(r, 1000)); // Wait a second before restarting
    spawn('npm.cmd', ['start'], { cwd: __dirname, detached: true, stdio: 'ignore' }).unref();
    const up = await waitBackendUp();
    res.json({ ok: up, action: 'restart', state: await serviceState() });
  } catch (err) {
    console.error('Restart error:', err);
    res.json({ ok: false, action: 'restart', error: err.message, state: await serviceState() });
  }
});

app.post('/fix-port', async (_req, res) => {
  await stopBackend();
  spawn('npm.cmd', ['start'], { cwd: __dirname, detached: true, stdio: 'ignore' }).unref();
  const up = await waitBackendUp();
  res.json({ ok: up, action: 'fix-port', state: await serviceState() });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log('Teletalk controller running on http://127.0.0.1:' + PORT);
});
