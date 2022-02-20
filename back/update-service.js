const { dialog } = require("electron")
const { getMainWindow } = require("./electron-tools")
const { autoUpdater } = require('electron-updater')


let win = getMainWindow()

autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

function update_available(info){
    dialog.showMessageBox(win, {
        message: `There is a new update available: ${info.version}\n\n${info.releaseNotes}\n\nIt will be downloaded automatically!`
    }).then()
}
function update_not_available(info){
    console.info(`No update available. - Currently running latest on ${info.version}`)
}
function update_downloaded(){
    let resp = dialog.showMessageBoxSync(win, {
        buttons: ["Yes", "No"],
        message: "Update ready!\nDo you want to restart and update?"
    })
    if(resp === 0){
        autoUpdater.quitAndInstall()
    }else{
        autoUpdater.autoInstallOnAppQuit = true
    }
}
function update_error(error){
    dialog.showErrorBox("Update error", error)
}

autoUpdater.on("update-available", update_available)
autoUpdater.on("update-not-available", update_not_available)
autoUpdater.on("update-downloaded", update_downloaded)
autoUpdater.on("error", update_error)