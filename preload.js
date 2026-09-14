const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    togglePresenter: () => ipcRenderer.invoke('toggle-presenter'),
    getPresenterStatus: () => ipcRenderer.invoke('get-presenter-status'),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    onUpdateStatus: (callback) => {
        ipcRenderer.on('update-status', (event, data) => callback(data));
    }
});
