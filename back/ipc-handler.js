const { ipcMain } = require("electron")
const { getMainWindow } = require("./electron-tools")

let win = getMainWindow()

function registerIpcListener(channel, callback, once=false){
    ipcMain.handle(channel, (...resp) => {
        if(once){
            ipcMain.removeHandler(channel)
        }
        callback(...resp)
    })
}

function invoke(channel, ...args){
    win.webContents.send(channel, ...args)
}


module.exports = {
    registerIpcListener,
    invoke
}
