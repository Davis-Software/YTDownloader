const { contextBridge, ipcRenderer } = require("electron")
const path = require("path")


contextBridge.exposeInMainWorld("utils", {
    path: {
        join: (...args) => path.join(...args)
    },
    openExternal: (url) => ipcRenderer.invoke("openExternal", url)
})
contextBridge.exposeInMainWorld("ipc", {
    debug: {on: (channel, listener) => {
        ipcRenderer.on(`debug:${channel}`, listener)
    }},
    update: {onInfo: listener => {
            ipcRenderer.on("update:info", listener)
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
    startDownload: (url, format, container, target, fileType, metadata, thumbnail) => {
        ipcRenderer.invoke("downloader:startDownload", url, format, container, target, fileType, metadata, thumbnail).then()
    },
    killDownload: _ => {
        ipcRenderer.invoke("downloader:kill").then()
    }
})
contextBridge.exposeInMainWorld("progressBar", {
    on: (channel, listener) => {
        ipcRenderer.on(`progress-bar:${channel}`, listener)
    },
    create: (title, max, min, options = {}) =>
        ipcRenderer.invoke("progress-bar:create", title, max, min, options),
    provide: (id, call, value) =>
        ipcRenderer.invoke(`progress-bar:${call}:on-${id}`, value)
})
