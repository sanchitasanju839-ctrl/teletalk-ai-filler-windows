const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('backend', {
  start: () => ipcRenderer.invoke('start-backend'),
  stop: () => ipcRenderer.invoke('stop-backend'),
  checkStatus: () => ipcRenderer.invoke('check-status'),
  onStatusUpdate: (callback) => ipcRenderer.on('status-update', (event, data) => callback(data))
});
