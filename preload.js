const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    togglePresenter: () => ipcRenderer.invoke('toggle-presenter'),
    getPresenterStatus: () => ipcRenderer.invoke('get-presenter-status'),
    closePresenter: () => ipcRenderer.invoke('close-presenter'),
    toggleSyncPresenter: () => ipcRenderer.invoke('toggle-sync-presenter'),
    getSyncPresenterStatus: () => ipcRenderer.invoke('get-sync-presenter-status'),
    closeSyncPresenter: () => ipcRenderer.invoke('close-sync-presenter'),
    getDisplays: () => ipcRenderer.invoke('get-displays'),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    onUpdateStatus: (callback) => {
        ipcRenderer.on('update-status', (event, data) => callback(data));
    }
});
