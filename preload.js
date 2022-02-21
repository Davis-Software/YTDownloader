const { contextBridge, ipcRenderer } = require("electron")


contextBridge.exposeInMainWorld("ipc", {
    debug: {on: (channel, listener) => {
        ipcRenderer.on(`debug:${channel}`, listener)
    }}
})
contextBridge.exposeInMainWorld("controls", {
    minimize: callback => {
        ipcRenderer.invoke("window:minimize").then(callback)
    },
    close: callback => {
        ipcRenderer.invoke("window:close").then(callback)
    }
})
contextBridge.exposeInMainWorld("downloader", {
    getInfo: (url, callback) => {
        ipcRenderer.invoke("downloader:getInfo", url).then(callback)
    }
})