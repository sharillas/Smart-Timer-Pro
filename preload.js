const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    togglePresenter: () => ipcRenderer.invoke('toggle-presenter'),
    getPresenterStatus: () => ipcRenderer.invoke('get-presenter-status')
});
