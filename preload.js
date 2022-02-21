const { contextBridge, ipcRenderer } = require("electron")


contextBridge.exposeInMainWorld("ipc", {
    debug: {on: (channel, listener) => {
        ipcRenderer.on(`debug:${channel}`, listener)
    }}
})
contextBridge.exposeInMainWorld("downloader", {
    getInfo: (url, callback) => {
        ipcRenderer.invoke("downloader:getInfo", url).then(callback)
    }
})