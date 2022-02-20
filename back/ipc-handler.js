const { ipcMain, webContents } = require("electron")


function registerIpcListener(channel, callback, once=false){
    ipcMain.handle(channel, (...resp) => {
        if(once){
            ipcMain.removeHandler(channel)
        }
        callback(...resp)
    })
}

function invoke(channel, ...args){
    webContents.send(channel, ...args)
}


module.exports = {
    registerIpcListener,
    invoke
}
