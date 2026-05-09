const { spawn, exec } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.dirname(__dirname);
const PORT = 3000;

let backendProcess = null;
let isBackendRunning = false;

console.log('='.repeat(50));
console.log('Teletalk Backend Launcher');
console.log('='.repeat(50));
console.log('Project root:', PROJECT_ROOT);
console.log();

// Check if src/index.ts exists
if (!fs.existsSync(path.join(PROJECT_ROOT, 'src', 'index.ts'))) {
  console.error('[ERROR] src/index.ts not found!');
  console.error('Current directory:', PROJECT_ROOT);
  process.exit(1);
}

function pingBackend() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}/`, (res) => {
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

async function startBackend() {
  if (isBackendRunning) {
    console.log('[INFO] Backend already running');
    return true;
  }

  console.log('[INFO] Starting backend with: npm start');
  console.log('[INFO] Working directory:', PROJECT_ROOT);
  console.log();
  
  try {
    backendProcess = spawn('npm', ['start'], {
      cwd: PROJECT_ROOT,
      shell: true,
      stdio: 'inherit'
    });

    backendProcess.on('error', (error) => {
      console.error('\n[ERROR] Failed to start backend:', error.message);
      console.error('Details:', error);
      isBackendRunning = false;
      process.exit(1);
    });

    backendProcess.on('exit', (code, signal) => {
      console.log(`\n[INFO] Backend process exited with code ${code}, signal ${signal}`);
      isBackendRunning = false;
    });

    // Wait for backend to be ready
    console.log('[INFO] Waiting for backend to start...');
    let retries = 0;
    const maxRetries = 30;
    
    while (retries < maxRetries) {
      if (await pingBackend()) {
        isBackendRunning = true;
        console.log();
        console.log('='.repeat(50));
        console.log(`[SUCCESS] Backend is running!`);
        console.log(`[SUCCESS] URL: http://127.0.0.1:${PORT}`);
        console.log('='.repeat(50));
        console.log();
        return true;
      }
      process.stdout.write('.');
      await new Promise(r => setTimeout(r, 500));
      retries++;
    }

    console.error('\n\n[ERROR] Backend startup timeout after 15 seconds');
    console.error('The backend process started but is not responding.');
    console.error('Check if:');
    console.error('  1. Port 3000 is not already in use');
    console.error('  2. There are no errors in the backend output above');
    console.error('  3. Node.js and npm are properly installed');
    return false;
  } catch (error) {
    console.error('[ERROR] Unexpected error:', error);
    return false;
  }
}

async function stopBackend() {
  console.log('\n[INFO] Stopping backend...');
  
  try {
    if (backendProcess) {
      backendProcess.kill('SIGTERM');
      backendProcess = null;
    }

    // Kill any remaining processes on port 3000
    exec('netstat -ano | findstr :3000', (error, stdout) => {
      if (stdout) {
        const lines = stdout.split('\n');
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && /^\d+$/.test(pid)) {
            exec(`taskkill /F /PID ${pid}`);
          }
        });
      }
    });

    isBackendRunning = false;
    console.log('[OK] Backend stopped');
  } catch (error) {
    console.error('[ERROR] Stop error:', error.message);
  }
}

async function main() {
  // Start backend
  const started = await startBackend();
  
  if (!started) {
    console.error('\n[FAILED] Could not start backend');
    console.error('Make sure:');
    console.error('  1. Node.js is installed');
    console.error('  2. You ran: npm install');
    console.error('  3. You are in the project root directory');
    process.exit(1);
  }

  // Handle Ctrl+C
  process.on('SIGINT', async () => {
    await stopBackend();
    process.exit(0);
  });

  // Keep running
  console.log('[TIP] Press Ctrl+C to stop the backend');
  console.log('[TIP] Backend is ready to use!');
  console.log();
}

main().catch(error => {
  console.error('[FATAL ERROR]', error);
  process.exit(1);
});
