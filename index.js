const { app, BrowserWindow } = require("electron")
const { autoUpdater } = require('electron-updater')
const config = require("./back/config")


if(config.devMode){
    app.setAppUserModelId(process.execPath)
}
app.allowRendererProcessReuse = true


let win


async function startMain(){
    if(app.requestSingleInstanceLock()){
        MainWindow()
    }
}
function MainWindow () {
    win = new BrowserWindow({
        width: 1200,
        height: 720,
        resizable: false,
        darkTheme: true,
        frame: config.devMode
    })

    win.identifier = "main-window"
    require("./back/update-service")
    if(!config.devMode) {
        autoUpdater.checkForUpdates().then()
    }

    win.on('focus', () => win.flashFrame(false))

    win.setIcon(config.iconPath)
    // win.loadFile("./templates/index.html").then()
}
app.whenReady().then(startMain)
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        MainWindow()
    }
})


// Single Instance lock
function openedByUrl(url) {
    if (url) {
        win.webContents.send('openedByUrl', url)
    }
}
if (app.requestSingleInstanceLock()) {
    app.on('second-instance', (e, argv) => {
            if (config.platform === 'win32') {
                openedByUrl(argv.find((arg) => arg.startsWith('swc_desktopapp:')))
            }
            if (win) {
                if (win.isMinimized()) win.restore()
                win.show()
                win.focus()
            }
        }
    )}

if (!app.isDefaultProtocolClient('swc_desktopapp')) {
    app.setAsDefaultProtocolClient('swc_desktopapp')
}