const { BrowserWindow } = require("electron")


function filterWindowsByIdentifier(identifier){
    let windows = BrowserWindow.getAllWindows()
    let filtered = []
    for(let win of windows){
        if(win.hasOwnProperty("identifier") && win.identifier === identifier){
            filtered.push(win)
        }
    }
    return filtered
}

function getMainWindow(){
    let mainWindow = filterWindowsByIdentifier("main-window")
    if(mainWindow.length > 0) return mainWindow[0]
    return null
}
function getAllProgressBars(){
    return filterWindowsByIdentifier("progress-bar")
}


module.exports = {
    filterWindowsByIdentifier,
    getMainWindow,
    getAllProgressBars
}
