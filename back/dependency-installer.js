const { platform, appDataDir } = require("./config")
const requests = require("./requests")
const fs = require("fs")
const path = require("path")
const { JSDOM } = require("jsdom")


class Dependency{
    constructor(id, target) {
        this.id = id
        this.target = target
        this.version = platform
        this.configFile = path.join(appDataDir, this.id)

        if(!fs.existsSync(this.configFile)){
            fs.writeFileSync(this.configFile, JSON.stringify({
                target: this.target,
                tag: null,
                platform
            }), {
                encoding: "utf-8"
            })
        }
    }
    makeExecutable(filepath, callback){
        fs.chmod(filepath, "0500", callback)
    }
    get config(){
        return JSON.parse(fs.readFileSync(this.configFile, {
            encoding: "utf-8"
        }))
    }
    setConfigVal(key, val){
        let conf = this.config
        conf[key] = val
        fs.writeFileSync(this.configFile, JSON.stringify(conf))
    }
}

class YoutubeDlDependency extends Dependency{
    constructor(target) {
        super("yt_dl", target)

        this.url = "https://github.com/ytdl-org/youtube-dl/releases/latest"
        this.files = ["youtube-dl", "youtube-dl.exe"]
    }
    _getLatestTag(callback){
        requests.getRequest(this.url).then(resp => {
            let document = new JSDOM(resp.data).window.document
            let tag = document.querySelector("li.breadcrumb-item-selected").textContent
                .replaceAll(" ", "")
                .replaceAll("\n", "")
            callback(tag)
        })
    }
    checkForUpdate(download){
        return new Promise(resolve => {
            let curr_tag = this.config.tag
            this._getLatestTag(tag => {
                if(download && ((tag > curr_tag) || curr_tag === null)){
                    let file = this.version === "unix" ? this.files[0] : this.files[1]
                    let url = this.url.split("/")
                    url.pop()
                    url.push("download", tag, file)
                    url = url.join("/")

                    this.setConfigVal("tag", tag)
                    requests.downloadRequest(url, path.join(this.target, file)).then(_ => {
                        this.makeExecutable(path.join(this.target, file), () => {
                            resolve(tag)
                        })
                    })
                }else{
                    resolve(false)
                }
            })
        })
    }
    get executor(){
        return path.join(this.target, this.version === "unix" ? this.files[0] : this.files[1])
    }
}

class Ffmpeg extends Dependency{
    constructor(target) {
        super("ffmpeg", target)

        this.savedLocation = "./tools"
        this.files = ["ffmpeg", "ffmpeg.exe"]
    }
    checkForInstall(){
        return new Promise(resolve => {
            let file = this.version === "unix" ? this.files[0] : this.files[1]
            let fPath = path.join(this.target, file)
            if(!fs.existsSync(fPath)){
                fs.copyFile(path.join(this.savedLocation, file), fPath, () => {
                    this.makeExecutable(path.join(this.target, file), () => {
                        resolve(true)
                    })
                })
            }else{
                resolve(false)
            }
        })
    }
    get executor(){
        return path.join(this.target, this.version === "unix" ? this.files[0] : this.files[1])
    }
}


let installDir = path.join(appDataDir, "tools")
fs.mkdirSync(installDir, {
    recursive: true
})

module.exports = {
    YoutubeDlPackage: new YoutubeDlDependency(installDir),
    FfmpegPackage: new Ffmpeg(installDir)
}
