import { app, BrowserWindow, BrowserView, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow = null;
let webView = null;
// Register IPC handlers ONCE at module level
ipcMain.on('update-layout', (event, bounds) => {
    if (mainWindow && webView) {
        console.log('Updating layout:', bounds);
        webView.setBounds({
            x: Math.round(bounds.x),
            y: Math.round(bounds.y),
            width: Math.round(bounds.width),
            height: Math.round(bounds.height)
        });
    }
});
ipcMain.handle('browser-navigate', (event, url) => {
    console.log('Navigating to:', url);
    if (webView)
        webView.webContents.loadURL(url);
});
ipcMain.handle('browser-go-back', () => {
    if (webView?.webContents.canGoBack())
        webView.webContents.goBack();
});
ipcMain.handle('browser-go-forward', () => {
    if (webView?.webContents.canGoForward())
        webView.webContents.goForward();
});
ipcMain.handle('browser-reload', () => {
    if (webView)
        webView.webContents.reload();
});
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#0B0B15',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    const isDev = !app.isPackaged;
    const devUrl = 'http://localhost:5173';
    if (isDev) {
        mainWindow.loadURL(devUrl);
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    // Create the BrowserView for web content
    webView = new BrowserView({
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        }
    });
    mainWindow.setBrowserView(webView);
    // Set initial visible bounds (will be updated by React)
    const bounds = mainWindow.getBounds();
    const sidebarWidth = 380;
    const titlebarHeight = 46;
    const navbarHeight = 52;
    const topOffset = titlebarHeight + navbarHeight;
    webView.setBounds({
        x: 0,
        y: topOffset,
        width: bounds.width - sidebarWidth,
        height: bounds.height - topOffset
    });
    webView.setAutoResize({ width: true, height: true });
    // Load default URL
    webView.webContents.loadURL('https://google.com');
    // Send events to React
    webView.webContents.on('did-start-loading', () => {
        mainWindow?.webContents.send('browser-loading', true);
    });
    webView.webContents.on('did-stop-loading', () => {
        mainWindow?.webContents.send('browser-loading', false);
    });
    webView.webContents.on('did-navigate', (event, url) => {
        mainWindow?.webContents.send('browser-url-changed', url);
    });
    webView.webContents.on('did-navigate-in-page', (event, url) => {
        mainWindow?.webContents.send('browser-url-changed', url);
    });
    webView.webContents.on('page-title-updated', (event, title) => {
        mainWindow?.webContents.send('browser-title-changed', title);
    });
    // Handle window resize
    mainWindow.on('resize', () => {
        if (mainWindow && webView) {
            const newBounds = mainWindow.getBounds();
            webView.setBounds({
                x: 0,
                y: topOffset,
                width: newBounds.width - sidebarWidth,
                height: newBounds.height - topOffset
            });
        }
    });
}
// Enable Remote Debugging Port for CDP (use unique port to avoid conflicts)
app.commandLine.appendSwitch('remote-debugging-port', '9333');
app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
