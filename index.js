const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron")
const { autoUpdater } = require('electron-updater')
const config = require("./back/config")

const { YoutubeDlPackage, FfmpegPackage } = require("./back/dependency-installer")
const downloader = require("./back/downloader")
const path = require("path");


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
        frame: config.devMode,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
        }
    })

    win.identifier = "main-window"
    require("./back/update-service")
    if(!config.devMode && config.autoUpdate) {
        autoUpdater.checkForUpdates().then()
    }

    ipcMain.handle("window:minimize", _ => {
        win.minimize()
    })
    ipcMain.handle("window:close", _ => {
        win.close()
    })
    ipcMain.handle("window:setProgressBar", (_, value) => {
        win.setProgressBar(value)
    })
    ipcMain.handle("window:flashFrame", (_, value) => {
        win.flashFrame(value)
    })

    ipcMain.handle("openExternal", (_, url) => {
        shell.openExternal(url)
    })

    ipcMain.handle("dialog:showDialog", (event, responder, options) => {
        dialog.showOpenDialog(win, options).then((result) => {
            win.webContents.send(responder, result)
        }).catch(err => {
            win.webContents.send("downloader:error", err)
        })
    })

    YoutubeDlPackage.checkForUpdate(true).then(ret => {
        console.log(ret ? "yt-dlp update successful" : "yt-dlp is up to date")
    })
    FfmpegPackage.checkForUpdate(true).then(ret => {
        console.log(ret ? "ffmpeg update successful" : "ffmpeg is up to date")
    })

    downloader.registerListeners()

    win.on('focus', () => win.flashFrame(false))
    win.setIcon(config.iconPath)
    if(!config.devMode){
        win.setMenu(null)
    }

    win.loadFile(path.join(__dirname, "templates", "index.html")).then()
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
