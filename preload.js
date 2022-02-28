const { contextBridge, ipcRenderer } = require("electron")
const path = require("path")


contextBridge.exposeInMainWorld("utils", {
    path: {
        join: (...args) => path.join(...args)
    }
})
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
    },
    setProgressBar: value => {
        ipcRenderer.invoke("window:setProgressBar", value).then()
    },
    flashFrame: value => {
        ipcRenderer.invoke("window:flashFrame", value).then()
    }
})
contextBridge.exposeInMainWorld("dialog", {
    on: (channel, listener) => {
        ipcRenderer.on(`dialog:${channel}`, listener)
    },
    showDialog: (options, resp, callback=_ => {}) => {
        let responder = `dialog:showDialogResponse:${resp}`
        ipcRenderer.invoke("dialog:showDialog", responder, options).then(_ => {callback(responder)})
    }
})
contextBridge.exposeInMainWorld("downloader", {
    on: (channel, listener) => {
        ipcRenderer.on(`downloader:${channel}`, listener)
    },
    getInfo: (url, callback=_ => {}) => {
        let responder = "downloader:returnInfo"
        ipcRenderer.invoke("downloader:getInfo", responder, url).then(_ => {callback(responder)})
    },
    startDownload: (url, format, target, fileType, metadata, thumbnail) => {
        ipcRenderer.invoke("downloader:startDownload", url, format, target, fileType, metadata, thumbnail).then()
    },
    killDownload: _ => {
        ipcRenderer.invoke("downloader:kill").then()
    }
})