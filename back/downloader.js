const { YoutubeDlPackage, FfmpegPackage } = require("./dependency-installer")
const { create } = require("youtube-dl-exec")
const { execFile } = require("child_process")
const { registerIpcListener, invoke } = require("./ipc-handler")
const { appDataDir } = require("./config")
const path = require("path")
const fs = require("fs")


const youtubeDl = create(YoutubeDlPackage.executor)


function makeError(err){
    return{
        shortMessage: err.shortMessage,
        command: err.command,
        escapedCommand: err.escapedCommand,
        exitCode: err.exitCode,
        signal: err.signal,
        signalDescription: err.signalDescription,
        stdout: err.stdout,
        stderr: err.stderr,
        failed: err.failed,
        timedOut: err.timedOut,
        isCanceled: err.isCanceled,
        killed: err.killed
    }
}


class YoutubeDlVideo{
    constructor(url) {
        this.url = url
        this.target = path.join(appDataDir, "targets")
        this._downloaded = false

        fs.mkdirSync(this.target, {
            recursive: true
        })
    }
    getInfo(){
        return youtubeDl(this.url, {
            dumpSingleJson: true,
            noWarnings: true,
            callHome: false,
            noCheckCertificate: true
        })
    }
    download(format, target, fileType){
        invoke("downloader:progress:reset")
        invoke("downloader:progress:info", "Gathering video information...")
        invoke("downloader:progress:mode", "unstable")
        this.getInfo().then(info => {
            const ytDownload = execFile(YoutubeDlPackage.executor, [
                "-f", format,
                "-o", target + `\\out.${fileType}`,
                "--merge-output-format", fileType,
                "--ffmpeg-location", FfmpegPackage.executor,
                this.url
            ])

            ytDownload.stdout.on("data", data => {
                let output = data.trim().split(" ").filter(n => n)
                if (output[0] === '[download]' && parseFloat(output[1])){
                    invoke("downloader:progress:data", {
                        progress: parseFloat(output[1]),
                        size: output[3],
                        transferred: output[5],
                        estimated: output[7]
                    })
                }
                console.log(data)
            })
            ytDownload.stdout.on('end', data => {
                console.log('stdout end', data)
            })
            ytDownload.stdout.on('close', data => {
                console.log('stdout close', data)
            });
            ytDownload.stderr.on('end', data => {
                console.log('end', data)
            })
            ytDownload.stderr.on('close', data => {
                console.log('close', data)
            })
            ytDownload.stderr.on('data', data => {
                console.log('data', data)
            })
        }).catch(err => {
            invoke("downloader:error", makeError(err))
        })
    }
}

function registerListeners() {
    registerIpcListener("downloader:getInfo", (_, responder, url) => {
        let video = new YoutubeDlVideo(url)
        video.getInfo().then(info => {
            invoke(responder, info)
        }).catch(err => {
            invoke("downloader:error", makeError(err))
        })
    })
    registerIpcListener("downloader:startDownload", (_, url, format, target, fileType) => {
        let video = new YoutubeDlVideo(url)
        video.download(format, target, fileType)
    })
}

module.exports = {
    YoutubeDlVideo,
    registerListeners
}
