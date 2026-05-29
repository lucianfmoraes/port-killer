const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 800,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Lógica para listar as portas ativas (Windows e Linux/macOS)
ipcMain.handle('list-ports', async () => {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';
    // Comando Windows: netstat | Comando Unix: lsof
    const cmd = isWin 
      ? 'netstat -ano -p tcp' 
      : 'lsof -iTCP -sTCP:LISTEN -P -n';

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        resolve([]);
        return;
      }

      const lines = stdout.split('\n');
      const ports = [];

      if (isWin) {
        // Parse para Windows
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5 && parts[0] === 'TCP') {
            const localAddress = parts[1];
            const port = localAddress.split(':').pop();
            const pid = parts[4];
            if (port && pid && !ports.some(p => p.port === port)) {
              ports.push({ port, pid, process: `PID: ${pid}` });
            }
          }
        });
      } else {
        // Parse para macOS / Linux
        lines.forEach((line, index) => {
          if (index === 0) return; // Pula o cabeçalho
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            const name = parts[0];
            const pid = parts[1];
            const nameTarget = parts[parts.length - 2] || '';
            const port = nameTarget.split(':').pop();
            if (port && pid && !ports.some(p => p.port === port)) {
              ports.push({ port, pid, process: name });
            }
          }
        });
      }

      // Ordenar por número de porta
      resolve(ports.sort((a, b) => parseInt(a.port) - parseInt(b.port)));
    });
  });
});

// Lógica para fechar a porta matando o PID
ipcMain.handle('kill-port', async (event, pid) => {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: stderr || error.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});
