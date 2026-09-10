const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow = null;
let presenterWindow = null;
let serverInstance = null;

function startServer() {
    const userDataPath = app.getPath('userData');
    const server = require('./server.js');
    server.init({ dataDir: userDataPath });
    serverInstance = server;
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

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (presenterWindow && !presenterWindow.isDestroyed()) {
            presenterWindow.close();
            presenterWindow = null;
        }
        app.quit();
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
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (presenterWindow) {
        presenterWindow.close();
    }
});
