const { dialog } = require("electron")
const { getMainWindow } = require("./electron-tools")
const { invoke } = require("./ipc-handler")
const { autoUpdater } = require('electron-updater')


let win = getMainWindow()

autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

function update_available(info){
    invoke("update:info", info)
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

exports.update_available = update_available
