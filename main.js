const { app, BrowserWindow, ipcMain, screen, dialog, Tray, Menu, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// Updates download automatically once the user clicks CHECK FOR UPDATES
autoUpdater.autoDownload = true;

let mainWindow = null;
let presenterWindow = null;
let serverInstance = null;
let tray = null;
let isQuitting = false;
let presenterEnabled = false;
let syncPresenterWindow = null;
let syncPresenterEnabled = false;
let timer2Window = null;
let timer2Enabled = false;
let httpsEnabled = false;

const pageProtocol = () => (httpsEnabled ? 'https' : 'http');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        showMainWindow();
    });
}

function sendTimerCommand(cmd) {
    fetch(pageProtocol() + `://127.0.0.1:3000/api/${cmd}`).catch(() => {});
}

function showMainWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.isVisible()) mainWindow.show();
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    } else {
        createMainWindow();
    }
}

function createTray() {
    const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));
    tray = new Tray(icon);
    tray.setToolTip('Smart Timer Pro');

    const menu = Menu.buildFromTemplate([
        { label: 'Open Smart Timer Pro', click: () => showMainWindow() },
        { type: 'separator' },
        { label: 'GO / Pause', click: () => sendTimerCommand('toggle_playback') },
        { label: 'Reset Timer', click: () => sendTimerCommand('reset') },
        { type: 'separator' },
        { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
    ]);
    tray.setContextMenu(menu);
    tray.on('click', () => showMainWindow());
}

function startServer() {
    try {
        const userDataPath = app.getPath('userData');
        const server = require('./server.js');
        server.init({ dataDir: userDataPath });
        serverInstance = server;

        // If HTTPS is enabled, Electron needs to accept the self-signed certificate
        try {
            const settingsPath = path.join(userDataPath, 'settings.json');
            const saved = JSON.parse(require('fs').readFileSync(settingsPath, 'utf8'));
            httpsEnabled = saved.httpsEnabled === true;
        } catch (e) {
            httpsEnabled = false;
        }
        if (httpsEnabled) {
            app.commandLine.appendSwitch('ignore-certificate-errors');
        }

        server.startListening();
    } catch (e) {
        dialog.showErrorBox(
            'Smart Timer Pro',
            'Could not start the server (port 3000 may be in use by another application).\n\n' + (e && e.message ? e.message : e)
        );
        app.quit();
    }
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1100,
        minHeight: 700,
        title: 'Smart Timer Pro - Moderator',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        backgroundColor: '#090d15',
        show: false
    });

    mainWindow.loadURL(pageProtocol() + '://127.0.0.1:3000/');
    mainWindow.setMenuBarVisibility(false);

    // The WEB TIMER (remote control) opens as a dedicated, fully resizable
    // window so it can be sized freely on any device/screen.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (String(url).includes('remote.html')) {
            const remoteWin = new BrowserWindow({
                width: 440,
                height: 860,
                minWidth: 340,
                minHeight: 560,
                resizable: true,
                maximizable: true,
                title: 'Smart Timer Pro - Web Timer',
                icon: path.join(__dirname, 'assets', 'icon.png'),
                autoHideMenuBar: true,
                useContentSize: true,
                webPreferences: {
                    contextIsolation: true,
                    nodeIntegration: false
                }
            });
            remoteWin.loadURL(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Closing the window (X) closes the main window AND the external display.
    // The app keeps running in the system tray; "Open Smart Timer Pro" brings it back.
    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            presenterEnabled = false;
            if (presenterWindow && !presenterWindow.isDestroyed()) {
                presenterWindow.close();
                presenterWindow = null;
            }
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (presenterWindow && !presenterWindow.isDestroyed()) {
            presenterWindow.close();
            presenterWindow = null;
        }
    });
}

function createPresenterWindow() {
    const displays = screen.getAllDisplays();

    if (presenterWindow) {
        presenterWindow.close();
        presenterWindow = null;
    }
    presenterEnabled = true;

    const hasExternalMonitor = displays.length > 1;

    // Choose the display: never the primary when external displays exist.
    // Saved choice first (only if it is not the primary), then the first
    // non-primary display, then the fallback window mode on the primary.
    let targetDisplay = null;
    if (hasExternalMonitor) {
        try {
            if (serverInstance && serverInstance.getSettings) {
                const savedId = serverInstance.getSettings().presenterDisplayId;
                if (savedId !== undefined && savedId !== null && savedId !== '') {
                    const found = displays.find((d) => d.id === Number(savedId) && displays.indexOf(d) !== 0);
                    if (found) targetDisplay = found;
                }
            }
        } catch (e) {
            // ignore, use default
        }
        if (!targetDisplay) {
            targetDisplay = displays.slice(1).find(() => true) || null;
        }
    }

    let bounds = null;
    if (targetDisplay) {
        bounds = targetDisplay.bounds;
    } else {
        // no external display: fallback window on the primary (not fullscreen)
        bounds = displays[0].bounds;
    }

    const { x, y, width, height } = bounds;

    let bgMode = 'color';
    if (serverInstance && serverInstance.getSettings) {
        bgMode = serverInstance.getSettings().bgMode || 'color';
    }
    const isTransparent = bgMode === 'transparent';

    const windowOpts = {
        x: x,
        y: y,
        title: 'Smart Timer Pro - Presenter',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        backgroundColor: isTransparent ? '#00000000' : '#000000',
        show: false,
        autoHideMenuBar: true
    };

    if (hasExternalMonitor) {
        windowOpts.width = width;
        windowOpts.height = height;
        windowOpts.fullscreen = true;
        windowOpts.frame = false;
        windowOpts.resizable = false;
        windowOpts.thickFrame = false;
        if (isTransparent) {
            windowOpts.transparent = true;
        }
    } else {
        windowOpts.width = 800;
        windowOpts.height = 300;
        windowOpts.frame = false;
        windowOpts.thickFrame = false;
        windowOpts.resizable = true;
        windowOpts.alwaysOnTop = true;
        if (isTransparent) {
            windowOpts.transparent = true;
            windowOpts.hasShadow = false;
        }
    }

    presenterWindow = new BrowserWindow(windowOpts);

    presenterWindow.loadURL(pageProtocol() + '://127.0.0.1:3000/presenter.html');

    presenterWindow.once('ready-to-show', () => {
        presenterWindow.show();
    });

    // Auto-recovery: if the presenter window crashes or is lost (e.g. display
    // unplugged), reopen it automatically unless it was closed on purpose.
    presenterWindow.on('closed', () => {
        presenterWindow = null;
        if (presenterEnabled && !isQuitting && mainWindow) {
            setTimeout(() => {
                if (presenterEnabled && !isQuitting && !presenterWindow && mainWindow) {
                    createPresenterWindow();
                }
            }, 2000);
        }
    });

    presenterWindow.webContents.on('render-process-gone', () => {
        presenterWindow = null;
        if (presenterEnabled && !isQuitting && mainWindow) {
            setTimeout(() => {
                if (presenterEnabled && !isQuitting && !presenterWindow && mainWindow) {
                    createPresenterWindow();
                }
            }, 2000);
        }
    });
}

function togglePresenterWindow() {
    if (presenterWindow) {
        presenterEnabled = false;
        presenterWindow.close();
        presenterWindow = null;
    } else {
        createPresenterWindow();
    }
}

// --- SECOND PRESENTER (external sync timer) ---
function createSyncPresenterWindow() {
    const displays = screen.getAllDisplays();
    syncPresenterEnabled = true;

    let targetDisplay = null;
    if (displays.length > 1) {
        try {
            if (serverInstance && serverInstance.getSettings) {
                const savedId = serverInstance.getSettings().presenterSyncDisplayId;
                if (savedId !== undefined && savedId !== null && savedId !== '') {
                    const found = displays.find((d) => d.id === Number(savedId) && displays.indexOf(d) !== 0);
                    if (found) targetDisplay = found;
                }
            }
        } catch (e) { /* default */ }
        if (!targetDisplay) targetDisplay = displays.slice(1).find(() => true) || null;
    }

    let windowOpts = {
        title: 'Smart Timer Pro - External Sync',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        backgroundColor: '#000000',
        show: false,
        autoHideMenuBar: true
    };

    if (targetDisplay) {
        const { x, y, width, height } = targetDisplay.bounds;
        windowOpts.x = x;
        windowOpts.y = y;
        windowOpts.width = width;
        windowOpts.height = height;
        windowOpts.fullscreen = true;
        windowOpts.frame = false;
        windowOpts.resizable = false;
        windowOpts.thickFrame = false;
    } else {
        // fallback window on the primary: restore the last saved position/size.
        // Standard frame so the operator can drag it to any area.
        windowOpts.width = 640;
        windowOpts.height = 220;
        windowOpts.resizable = true;
        windowOpts.alwaysOnTop = true;
        try {
            if (serverInstance && serverInstance.getSettings) {
                const s = serverInstance.getSettings();
                if (Number.isFinite(s.syncWindowX) && Number.isFinite(s.syncWindowY)) {
                    const work = displays[0] ? displays[0].workArea : null;
                    const x = Math.round(s.syncWindowX);
                    const y = Math.round(s.syncWindowY);
                    if (work) {
                        windowOpts.x = Math.min(Math.max(x, work.x), work.x + work.width - 120);
                        windowOpts.y = Math.min(Math.max(y, work.y), work.y + work.height - 60);
                    } else {
                        windowOpts.x = x;
                        windowOpts.y = y;
                    }
                }
                if (Number.isFinite(s.syncWindowW) && s.syncWindowW >= 320) windowOpts.width = Math.round(s.syncWindowW);
                if (Number.isFinite(s.syncWindowH) && s.syncWindowH >= 120) windowOpts.height = Math.round(s.syncWindowH);
            }
        } catch (e) { /* defaults */ }
    }

    syncPresenterWindow = new BrowserWindow(windowOpts);
    syncPresenterWindow.loadURL(pageProtocol() + '://127.0.0.1:3000/presenter.html?view=sync');

    // Remember the fallback window position/size so OPEN DISPLAY reopens it
    // in the same area (fullscreen mode ignores these values).
    let saveBoundsTimer = null;
    const saveBounds = () => {
        if (!syncPresenterWindow || syncPresenterWindow.isDestroyed()) return;
        if (!serverInstance || !serverInstance.getSettings) return;
        const s = serverInstance.getSettings();
        if (s.presenterSyncDisplayId) return; // fullscreen on a display: skip
        const b = syncPresenterWindow.getBounds();
        try {
            fetch(pageProtocol() + '://127.0.0.1:3000/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    syncWindowX: b.x,
                    syncWindowY: b.y,
                    syncWindowW: b.width,
                    syncWindowH: b.height
                })
            }).catch(() => {});
        } catch (e) { /* ignore */ }
    };
    const scheduleSaveBounds = () => {
        if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
        saveBoundsTimer = setTimeout(saveBounds, 800);
    };
    syncPresenterWindow.on('moved', scheduleSaveBounds);
    syncPresenterWindow.on('resized', scheduleSaveBounds);
    syncPresenterWindow.on('closed', () => {
        if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
    });

    syncPresenterWindow.once('ready-to-show', () => {
        syncPresenterWindow.show();
    });

    syncPresenterWindow.on('closed', () => {
        syncPresenterWindow = null;
        if (syncPresenterEnabled && !isQuitting && mainWindow) {
            setTimeout(() => {
                if (syncPresenterEnabled && !isQuitting && !syncPresenterWindow && mainWindow) {
                    createSyncPresenterWindow();
                }
            }, 2000);
        }
    });
}

function toggleSyncPresenterWindow() {
    if (syncPresenterWindow) {
        // Reopen: the user may have picked a different display — recreate
        // the window so it moves to the newly selected monitor.
        syncPresenterEnabled = false;
        syncPresenterWindow.close();
        syncPresenterWindow = null;
        createSyncPresenterWindow();
    } else {
        createSyncPresenterWindow();
    }
}

// --- SECOND TIMER PRESENTER (independent display output) ---
function createTimer2PresenterWindow() {
    const displays = screen.getAllDisplays();
    timer2Enabled = true;

    let targetDisplay = null;
    if (displays.length > 1) {
        try {
            if (serverInstance && serverInstance.getSettings) {
                const savedId = serverInstance.getSettings().presenter2DisplayId;
                if (savedId !== undefined && savedId !== null && savedId !== '') {
                    const found = displays.find((d) => d.id === Number(savedId) && displays.indexOf(d) !== 0);
                    if (found) targetDisplay = found;
                }
            }
        } catch (e) { /* default */ }
        if (!targetDisplay) targetDisplay = displays.slice(1).find(() => true) || null;
    }

    let windowOpts = {
        title: 'Smart Timer Pro - Second Timer',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        backgroundColor: '#000000',
        show: false,
        autoHideMenuBar: true
    };

    if (targetDisplay) {
        const { x, y, width, height } = targetDisplay.bounds;
        windowOpts.x = x;
        windowOpts.y = y;
        windowOpts.width = width;
        windowOpts.height = height;
        windowOpts.fullscreen = true;
        windowOpts.frame = false;
        windowOpts.resizable = false;
        windowOpts.thickFrame = false;
    } else {
        // fallback window on the primary: restore the last saved position/size
        windowOpts.width = 640;
        windowOpts.height = 220;
        windowOpts.resizable = true;
        windowOpts.alwaysOnTop = true;
        try {
            if (serverInstance && serverInstance.getSettings) {
                const s = serverInstance.getSettings();
                if (Number.isFinite(s.timer2WindowX) && Number.isFinite(s.timer2WindowY)) {
                    const work = displays[0] ? displays[0].workArea : null;
                    const x = Math.round(s.timer2WindowX);
                    const y = Math.round(s.timer2WindowY);
                    if (work) {
                        windowOpts.x = Math.min(Math.max(x, work.x), work.x + work.width - 120);
                        windowOpts.y = Math.min(Math.max(y, work.y), work.y + work.height - 60);
                    } else {
                        windowOpts.x = x;
                        windowOpts.y = y;
                    }
                }
                if (Number.isFinite(s.timer2WindowW) && s.timer2WindowW >= 320) windowOpts.width = Math.round(s.timer2WindowW);
                if (Number.isFinite(s.timer2WindowH) && s.timer2WindowH >= 120) windowOpts.height = Math.round(s.timer2WindowH);
            }
        } catch (e) { /* defaults */ }
    }

    timer2Window = new BrowserWindow(windowOpts);
    timer2Window.loadURL(pageProtocol() + '://127.0.0.1:3000/presenter.html?view=timer2');

    let saveBoundsTimer = null;
    const saveBounds = () => {
        if (!timer2Window || timer2Window.isDestroyed()) return;
        if (!serverInstance || !serverInstance.getSettings) return;
        const s = serverInstance.getSettings();
        if (s.presenter2DisplayId) return;
        const b = timer2Window.getBounds();
        try {
            fetch(pageProtocol() + '://127.0.0.1:3000/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timer2WindowX: b.x,
                    timer2WindowY: b.y,
                    timer2WindowW: b.width,
                    timer2WindowH: b.height
                })
            }).catch(() => {});
        } catch (e) { /* ignore */ }
    };
    const scheduleSaveBounds = () => {
        if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
        saveBoundsTimer = setTimeout(saveBounds, 800);
    };
    timer2Window.on('moved', scheduleSaveBounds);
    timer2Window.on('resized', scheduleSaveBounds);
    timer2Window.on('closed', () => {
        if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
    });

    timer2Window.once('ready-to-show', () => {
        timer2Window.show();
    });

    timer2Window.on('closed', () => {
        timer2Window = null;
        if (timer2Enabled && !isQuitting && mainWindow) {
            setTimeout(() => {
                if (timer2Enabled && !isQuitting && !timer2Window && mainWindow) {
                    createTimer2PresenterWindow();
                }
            }, 2000);
        }
    });
}

function toggleTimer2PresenterWindow() {
    if (timer2Window) {
        // Reopen: the user may have picked a different display
        timer2Enabled = false;
        timer2Window.close();
        timer2Window = null;
        createTimer2PresenterWindow();
    } else {
        createTimer2PresenterWindow();
    }
}

// --- IPC HANDLERS ---
ipcMain.handle('toggle-presenter', () => {
    togglePresenterWindow();
    return presenterWindow !== null;
});

ipcMain.handle('close-presenter', () => {
    if (presenterWindow) {
        presenterEnabled = false;
        presenterWindow.close();
        presenterWindow = null;
    }
    return true;
});

ipcMain.handle('toggle-timer2-presenter', () => {
    toggleTimer2PresenterWindow();
    return timer2Window !== null;
});

ipcMain.handle('get-timer2-presenter-status', () => {
    return timer2Window !== null;
});

ipcMain.handle('close-timer2-presenter', () => {
    if (timer2Window) {
        timer2Enabled = false;
        timer2Window.close();
        timer2Window = null;
    }
    return true;
});

ipcMain.handle('toggle-sync-presenter', () => {
    toggleSyncPresenterWindow();
    return syncPresenterWindow !== null;
});

ipcMain.handle('get-sync-presenter-status', () => {
    return syncPresenterWindow !== null;
});

ipcMain.handle('close-sync-presenter', () => {
    if (syncPresenterWindow) {
        syncPresenterEnabled = false;
        syncPresenterWindow.close();
        syncPresenterWindow = null;
    }
    return true;
});

ipcMain.handle('get-presenter-status', () => {
    return presenterWindow !== null;
});

ipcMain.handle('get-displays', () => {
    return screen.getAllDisplays().map((d, i) => ({
        id: d.id,
        index: i,
        width: d.bounds.width,
        height: d.bounds.height,
        primary: i === 0
    }));
});

ipcMain.handle('get-app-info', () => {
    return {
        version: app.getVersion(),
        packaged: app.isPackaged
    };
});

ipcMain.handle('check-for-updates', async () => {
    if (!app.isPackaged) {
        return { status: 'dev', message: 'Auto-update only works in the installed app.' };
    }
    try {
        const result = await autoUpdater.checkForUpdates();
        return result ? { status: result.updateInfo.version ? 'checking' : 'checking' } : { status: 'checking' };
    } catch (e) {
        return { status: 'error', message: e && e.message ? e.message : String(e) };
    }
});

function broadcastUpdateStatus(data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-status', data);
    }
}

// --- APP LIFECYCLE ---
app.whenReady().then(() => {
    startServer();
    createTray();
    createMainWindow();

    // Optionally open the external display automatically at startup
    try {
        const settingsPath = path.join(app.getPath('userData'), 'settings.json');
        const saved = JSON.parse(require('fs').readFileSync(settingsPath, 'utf8'));
        if (saved.autoOpenPresenter === true) {
            setTimeout(() => createPresenterWindow(), 1500);
        }
    } catch (e) {
        // no saved settings yet
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });

    // Updates are only checked manually (Settings > Updates > CHECK FOR UPDATES)
    // — never automatically at launch.
});

autoUpdater.on('checking-for-update', () => {
    broadcastUpdateStatus({ status: 'checking', message: 'Checking for updates...' });
});

autoUpdater.on('update-available', (info) => {
    console.log('Update available, downloading...');
    broadcastUpdateStatus({ status: 'downloading', message: 'Update ' + info.version + ' found — downloading...' });
});

autoUpdater.on('update-not-available', () => {
    broadcastUpdateStatus({ status: 'uptodate', message: 'You are running the latest version.' });
});

autoUpdater.on('error', (e) => {
    broadcastUpdateStatus({ status: 'error', message: 'Update check failed: ' + (e && e.message ? e.message : e) });
});

autoUpdater.on('update-downloaded', (info) => {
    broadcastUpdateStatus({ status: 'ready', message: 'Version ' + info.version + ' ready — restart to install.' });
    dialog.showMessageBox({
        type: 'info',
        title: 'Smart Timer Pro — Update Ready',
        message: `Version ${info.version} is ready to install.`,
        detail: 'The update has been downloaded. Restart now to install it?',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0
    }).then((r) => {
        if (r.response === 0) {
            isQuitting = true;
            autoUpdater.quitAndInstall();
        }
    });
});

// Keep the app (and timer) alive when all windows are hidden/closed
app.on('window-all-closed', () => {
    // No quit: the app lives in the system tray
});

app.on('before-quit', () => {
    isQuitting = true;
    presenterEnabled = false;
    syncPresenterEnabled = false;
    timer2Enabled = false;
    if (presenterWindow) {
        presenterWindow.close();
    }
    if (syncPresenterWindow) {
        syncPresenterWindow.close();
    }
    if (timer2Window) {
        timer2Window.close();
    }
});
