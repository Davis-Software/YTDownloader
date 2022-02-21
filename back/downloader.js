const { YoutubeDlPackage, FfmpegPackage } = require("./dependency-installer")
const { create } = require("youtube-dl-exec")
const { execFile } = require("child_process")
const { registerIpcListener } = require("./ipc-handler")
const { appDataDir } = require("./config")
const path = require("path")
const fs = require("fs")


const youtubeDl = create(YoutubeDlPackage.executor)


class YoutubeDlVideo{
    constructor(url) {
        this.url = url
        this.target = path.join(appDataDir, "targets")

        fs.mkdirSync(this.target, {
            recursive: true
        })
    }
    getInfo(){
        return new Promise(resolve => {
            youtubeDl(this.url, {
                dumpSingleJson: true,
                noWarnings: true,
                callHome: false,
                noCheckCertificate: true
            }).then(resp => {
                resolve(resp)
            })
        })
    }
    // download(format, target, listener){
    //     const ytDownload = execFile(YoutubeDlPackage.executor, ["-f", format, "-o", target, this.url])
    // }
}

function registerListeners() {
    registerIpcListener("downloader:getInfo", (_, url) => {
        let video = new YoutubeDlVideo(url)
        return video.getInfo()
    })
}

module.exports = {
    YoutubeDlVideo,
    registerListeners
}
