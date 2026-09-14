const { app, BrowserWindow, ipcMain, screen, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;
let presenterWindow = null;
let serverInstance = null;
let tray = null;
let isQuitting = false;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

function sendTimerCommand(cmd) {
    fetch(`http://127.0.0.1:3000/api/${cmd}`).catch(() => {});
}

function createTray() {
    const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));
    tray = new Tray(icon);
    tray.setToolTip('Smart Timer Pro');

    const menu = Menu.buildFromTemplate([
        { label: 'Open Smart Timer Pro', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
        { type: 'separator' },
        { label: 'GO / Pause', click: () => sendTimerCommand('toggle_playback') },
        { label: 'Reset Timer', click: () => sendTimerCommand('reset') },
        { type: 'separator' },
        { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
    ]);
    tray.setContextMenu(menu);
    tray.on('click', () => {
        if (mainWindow) {
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
        }
    });
}

function startServer() {
    try {
        const userDataPath = app.getPath('userData');
        const server = require('./server.js');
        server.init({ dataDir: userDataPath });
        serverInstance = server;
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
        width: 1280,
        height: 850,
        minWidth: 1024,
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

    mainWindow.loadURL('http://127.0.0.1:3000/');
    mainWindow.setMenuBarVisibility(false);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Closing the window hides it to the system tray; the timer keeps running
    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
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

    const hasExternalMonitor = displays.length > 1;
    const targetDisplay = hasExternalMonitor ? displays[1] : displays[0];
    const { x, y, width, height } = targetDisplay.bounds;

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

    presenterWindow.loadURL('http://127.0.0.1:3000/presenter.html');

    presenterWindow.once('ready-to-show', () => {
        presenterWindow.show();
    });

    presenterWindow.on('closed', () => {
        presenterWindow = null;
    });
}

function togglePresenterWindow() {
    if (presenterWindow) {
        presenterWindow.close();
        presenterWindow = null;
    } else {
        createPresenterWindow();
    }
}

// --- IPC HANDLERS ---
ipcMain.handle('toggle-presenter', () => {
    togglePresenterWindow();
    return presenterWindow !== null;
});

ipcMain.handle('get-presenter-status', () => {
    return presenterWindow !== null;
});

// --- APP LIFECYCLE ---
app.whenReady().then(() => {
    startServer();
    createTray();
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

// Keep the app (and timer) alive when all windows are hidden/closed
app.on('window-all-closed', () => {
    // No quit: the app lives in the system tray
});

app.on('before-quit', () => {
    isQuitting = true;
    if (presenterWindow) {
        presenterWindow.close();
    }
});
