import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    navigate: (url) => ipcRenderer.invoke('browser-navigate', url),
    goBack: () => ipcRenderer.invoke('browser-go-back'),
    goForward: () => ipcRenderer.invoke('browser-go-forward'),
    reload: () => ipcRenderer.invoke('browser-reload'),
    updateLayout: (bounds) => ipcRenderer.send('update-layout', bounds),
    // Event listeners
    onLoading: (callback) => {
        ipcRenderer.on('browser-loading', (_, loading) => callback(loading));
    },
    onUrlChange: (callback) => {
        ipcRenderer.on('browser-url-changed', (_, url) => callback(url));
    },
    onTitleChange: (callback) => {
        ipcRenderer.on('browser-title-changed', (_, title) => callback(title));
    },
});
