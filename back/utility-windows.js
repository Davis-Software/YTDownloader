const {BrowserWindow, Menu} = require("electron")
const path = require("path");
const {registerIpcListener} = require("./ipc-handler");


class ProgressBar {
    constructor(title, max, min, readyCallback, options = {}) {
        let win = new BrowserWindow({
            frame: false,
            width: options.width || 300,
            height: options.height || (options.logVisible ? 200 : 80),
            resizable: false,
            alwaysOnTop: true,
            darkTheme: true,
            center: true,
            skipTaskbar: true,
            movable: true,
            webPreferences: {
                preload: path.join(__dirname, "../", "preload.js"),
                nodeIntegration: true
            }
        })
        win.loadFile(path.join(__dirname, "../templates/utils", "progress-bar.html")).then()
        win.webContents.addListener("did-finish-load", () => {
            this.progress.webContents.send("progress-bar:set-title", title)
            win.webContents.send("progress-bar:set-max", max)
            win.webContents.send("progress-bar:set-min", min)
            readyCallback(this)
        })
        win.identifier = "progress-bar"
        this.progress = win
        this.logVisible = options.logVisible || false
    }
    setValue(value) {
        this.progress.webContents.send("progress-bar:set-progress", value)
    }
    setText(text) {
        this.progress.webContents.send("progress-bar:set-text", text)
    }
    setInfo(info) {
        this.progress.webContents.send("progress-bar:set-info", info)
    }
    striped(bool = true) {
        this.progress.webContents.send("progress-bar:set-striped", bool)
    }
    removeAnimation() {
        this.progress.webContents.send("progress-bar:remove-animation")
    }
    log(level, message) {
        if(!this.logVisible) return
        this.progress.webContents.send("progress-bar:log", level, message)
    }
    close() {
        this.progress.close()
    }
}


function contextMenu(x, y, template) {
    return new Promise((resolve) => {
        template.forEach(item => {
            if(item.type === "separator") return
            item.click = () => {resolve(item.id)}
        })

        Menu.buildFromTemplate(template).popup({x, y, callback: () => {resolve(undefined)}})
    })
}


registerIpcListener("progress-bar:create", async (event, title, max, min, options) => {
    async function make(){
        return new Promise((resolve) => {
            let prBar = new ProgressBar(title, max, min, () => {
                let id = Math.round(Math.random()*1000000).toString()
                for(let method of ["setValue", "setText", "setInfo", "close"]){
                    registerIpcListener(`progress-bar:${method}:on-${id}`, (event, ...args) => {
                        prBar[method](...args)
                        return true
                    })
                }
                resolve(id)
            }, options)
        })
    }
    return await make()
})

registerIpcListener("context-menu:open", async (event, data) => {
    return await contextMenu(data.x, data.y, data.template)
})

module.exports = {ProgressBar}
