const { BrowserWindow } = require("electron")


function getMainWindow(){
    let windows = BrowserWindow.getAllWindows()
    for(let win of windows){
        if(win.identifier === "main-window"){
            return win
        }
    }
    return null
}


module.exports = {
    getMainWindow
}
