/**
 * Electron main process entry point.
 * Sets app root, registers IPC handlers, creates the main window, and runs app lifecycle.
 */

import { app } from 'electron';
import * as path from 'path';
import { createMainWindow, setAppRoot } from './main/windows.js';
import { registerIpcHandlers } from './main/ipc.js';

// Resolve app root: directory containing main.js (compiled from this file)
const appRoot = path.resolve(__dirname);
setAppRoot(appRoot);

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
