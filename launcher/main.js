const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const http = require('http');

let mainWindow;
let backendProcess = null;
let isBackendRunning = false;

const PROJECT_ROOT = path.join(__dirname, '..');

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

async function startBackend() {
  if (isBackendRunning) {
    return { success: true, message: 'Backend already running' };
  }

  try {
    isBackendRunning = true;
    mainWindow?.webContents.send('status-update', { running: true, message: 'Starting backend...' });

    backendProcess = spawn('npm', ['start'], {
      cwd: PROJECT_ROOT,
      detached: false,
      shell: true
    });

    backendProcess.on('error', (error) => {
      console.error('Failed to start backend:', error);
      isBackendRunning = false;
      mainWindow?.webContents.send('status-update', { running: false, message: 'Failed to start' });
    });

    backendProcess.on('exit', () => {
      isBackendRunning = false;
      mainWindow?.webContents.send('status-update', { running: false, message: 'Backend stopped' });
    });

    // Wait for backend to be ready
    let retries = 0;
    while (retries < 30) {
      if (await pingBackend()) {
        mainWindow?.webContents.send('status-update', { running: true, message: 'Backend running ✓' });
        return { success: true, message: 'Backend started successfully' };
      }
      await new Promise(r => setTimeout(r, 500));
      retries++;
    }

    mainWindow?.webContents.send('status-update', { running: false, message: 'Backend timeout' });
    return { success: false, message: 'Backend startup timeout' };
  } catch (error) {
    console.error('Start error:', error);
    isBackendRunning = false;
    mainWindow?.webContents.send('status-update', { running: false, message: 'Error: ' + error.message });
    return { success: false, message: error.message };
  }
}

async function stopBackend() {
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
    mainWindow?.webContents.send('status-update', { running: false, message: 'Backend stopped ✓' });
    return { success: true, message: 'Backend stopped' };
  } catch (error) {
    console.error('Stop error:', error);
    return { success: false, message: error.message };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 500,
    resizable: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('launcher/index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
  checkBackendStatus();
  setInterval(checkBackendStatus, 2000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

async function checkBackendStatus() {
  const running = await pingBackend();
  mainWindow?.webContents.send('status-update', {
    running: running,
    message: running ? 'Backend running ✓' : 'Backend not running'
  });
}

ipcMain.handle('start-backend', startBackend);
ipcMain.handle('stop-backend', stopBackend);
ipcMain.handle('check-status', async () => {
  return { running: await pingBackend() };
});

// Cleanup on exit
app.on('before-quit', async () => {
  await stopBackend();
});
