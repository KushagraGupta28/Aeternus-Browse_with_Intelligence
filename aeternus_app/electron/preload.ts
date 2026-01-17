import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    navigate: (url: string) => ipcRenderer.invoke('browser-navigate', url),
    goBack: () => ipcRenderer.invoke('browser-go-back'),
    goForward: () => ipcRenderer.invoke('browser-go-forward'),
    reload: () => ipcRenderer.invoke('browser-reload'),
    updateLayout: (bounds: { x: number, y: number, width: number, height: number }) => ipcRenderer.send('update-layout', bounds),
    // Event listeners
    onLoading: (callback: (loading: boolean) => void) => {
        ipcRenderer.on('browser-loading', (_, loading) => callback(loading));
    },
    onUrlChange: (callback: (url: string) => void) => {
        ipcRenderer.on('browser-url-changed', (_, url) => callback(url));
    },
    onTitleChange: (callback: (title: string) => void) => {
        ipcRenderer.on('browser-title-changed', (_, title) => callback(title));
    },
});
