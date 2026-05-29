const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  listPorts: () => ipcRenderer.invoke('list-ports'),
  killPort: (pid) => ipcRenderer.invoke('kill-port', pid)
});
