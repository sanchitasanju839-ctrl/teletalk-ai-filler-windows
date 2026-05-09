let isRunning = false;

const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const indicator = document.getElementById('indicator');
const statusTitle = document.getElementById('status-title');
const statusMessage = document.getElementById('status-message');

function updateStatus(data) {
  isRunning = data.running;
  
  if (isRunning) {
    indicator.className = 'status-indicator running';
    statusTitle.textContent = 'Online';
    statusMessage.textContent = data.message || 'Backend is running and ready';
    btnStart.disabled = true;
    btnStop.disabled = false;
  } else {
    indicator.className = 'status-indicator stopped';
    statusTitle.textContent = 'Offline';
    statusMessage.textContent = data.message || 'Backend is not running';
    btnStart.disabled = false;
    btnStop.disabled = true;
  }
}

btnStart.addEventListener('click', async () => {
  btnStart.disabled = true;
  btnStop.disabled = true;
  statusMessage.textContent = 'Starting backend...';
  
  try {
    const result = await window.backend.start();
    if (result.success) {
      updateStatus({ running: true, message: 'Backend started ✓' });
    } else {
      updateStatus({ running: false, message: 'Failed to start: ' + result.message });
    }
  } catch (error) {
    console.error('Start error:', error);
    updateStatus({ running: false, message: 'Error: ' + error.message });
  }
});

btnStop.addEventListener('click', async () => {
  btnStart.disabled = true;
  btnStop.disabled = true;
  statusMessage.textContent = 'Stopping backend...';
  
  try {
    const result = await window.backend.stop();
    updateStatus({ running: false, message: 'Backend stopped ✓' });
  } catch (error) {
    console.error('Stop error:', error);
    updateStatus({ running: false, message: 'Error: ' + error.message });
  }
});

// Listen for status updates from main process
window.backend.onStatusUpdate((data) => {
  updateStatus(data);
});

// Check initial status
window.backend.checkStatus().then(status => {
  updateStatus({
    running: status.running,
    message: status.running ? 'Backend is already running' : 'Backend is not running'
  });
});
