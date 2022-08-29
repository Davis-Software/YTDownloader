const { YoutubeDlPackage, FfmpegPackage } = require("./dependency-installer")
const { create } = require("youtube-dl-exec")
const { execFile } = require("child_process")
const { registerIpcListener, invoke } = require("./ipc-handler")
const { appDataDir } = require("./config")
const { downloadRequest } = require("./requests")
const path = require("path")
const fs = require("fs")


const youtubeDl = create(YoutubeDlPackage.executor)
let currentProcess
let aborted


function log(msg, tag="prim"){
    invoke("downloader:progress:log", {
        message: msg,
        tag
    })
}
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
function killProcess(){
    if(currentProcess){
        currentProcess.kill()
        aborted = true
    }
}


class YoutubeDlVideo{
    constructor(url) {
        this.url = url
        this.tempTarget = path.join(appDataDir, "targets")
        this.lastTarget = ""
        this.target = ""
        this._downloaded = false
        this.targetFormat = ""

        fs.mkdirSync(this.tempTarget, {
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
    download(format, target, fileType, callback){
        log("Initialized downloader components...")
        log("Starting to download...")

        invoke("downloader:progress:info", "Starting download...")
        invoke("downloader:progress:mode", "stable")
        this.target = target
        this.targetFormat = fileType
        this.lastTarget = "download-converted." + this.targetFormat

        const ytDownload = execFile(YoutubeDlPackage.executor, [
            "-f", format,
            "-o", path.join(this.tempTarget, this.lastTarget),
            "--merge-output-format", fileType,
            "--ffmpeg-location", FfmpegPackage.executor,
            "--audio-quality", "0",
            this.url
        ])
        currentProcess = ytDownload

        ytDownload.stdout.on("data", data => {
            log(data, "info")

            let output = data.trim().split(" ").filter(n => n)
            if (output[0] === '[download]' && parseFloat(output[1])){
                invoke("downloader:progress:data", {
                    progress: parseFloat(output[1]),
                    size: output[3],
                    speed: output[5],
                    estimated: output[7],
                    transferred: parseFloat(output[3]) * (parseFloat(output[1]) / 100)
                })
            }
        })
        ytDownload.stdout.on('close', _ => {
            if(aborted){
                log("Download Aborted by user", "warn")
                invoke("downloader:progress:downloadAborted")
                aborted = false
            }else {
                log("Download process completed")
                this._downloaded = true
                callback()
            }
        })

        ytDownload.stderr.on('data', data => {
            log(data, "err")
        })
    }
    static ffMpegProcess(options, callback){
        const convert = execFile(FfmpegPackage.executor, options)
        currentProcess = convert
        convert.addListener("error", err => {
            log(err, "warn")
        })
        convert.addListener("close", _ => {
            if(aborted){
                invoke("downloader:progress:downloadAborted")
                aborted = false
            }else{
                callback()
            }
        })
    }
    applyMetadata(data, callback){
        if(!this._downloaded) return

        log("Applying metadata to file")
        invoke("downloader:progress:info", "Applying metadata...")
        invoke("downloader:progress:mode", "unstable")

        let convTarget = String(this.lastTarget)
        this.lastTarget = "download-metadata." + this.targetFormat
        let options = [
            "-y",
            "-i", path.join(this.tempTarget, convTarget),
            "-movflags", "use_metadata_tags",
            "-map_metadata", "0"
        ]
        for(let key in data){
            options.push(...[
                "-metadata", `${key}=${data[key]}`
            ])
        }
        options.push(...[
            // "-c", "copy",
            "-strict", "-2"
        ])
        options.push(path.join(this.tempTarget, this.lastTarget))
        YoutubeDlVideo.ffMpegProcess(options, callback)
    }
    applyThumbnail(thumbPath, callback){
        if(!this._downloaded) return

        log("Applying thumbnail to file")
        invoke("downloader:progress:info", "Applying thumbnail...")
        invoke("downloader:progress:mode", "unstable")

        let metaTarget = String(this.lastTarget)
        this.lastTarget = "download-thumbnail." + this.targetFormat
        let options = [
            "-y",
            "-i", path.join(this.tempTarget, metaTarget),
            "-i", thumbPath,
            "-map", "0",
            "-map", "1",
            "-c:v:1", "png",
            "-disposition:v:1", "attached_pic",
            path.join(this.tempTarget, this.lastTarget)
        ]
        YoutubeDlVideo.ffMpegProcess(options, callback)
    }
    downloadThumbnail(url, callback){
        log(`Downloading thumbnail from remote: ${url}`)
        invoke("downloader:progress:info", "Downloading thumbnail...")
        invoke("downloader:progress:mode", "unstable")
        downloadRequest(url, path.join(this.tempTarget, "thumb.png")).then(_ => {
            log("Thumbnail download completed")
            this.applyThumbnail(path.join(this.tempTarget, "thumb.png"), callback)
        })
    }
    copyToEndTarget(callback){
        log("Copying file to target location")
        invoke("downloader:progress:info", "Copying to final location...")
        invoke("downloader:progress:mode", "unstable")
        fs.copyFile(
            path.join(this.tempTarget, this.lastTarget),
            this.target,
            callback
        )
    }
    cleanup(){
        log("All done - cleaning up temporary files")
        invoke("downloader:progress:info", "Done")
        invoke("downloader:progress:mode", "stable")

        if(!this._downloaded) return
        if(fs.existsSync(path.join(this.tempTarget, "download-converted." + this.targetFormat))){
            fs.rm(path.join(this.tempTarget, "download-converted." + this.targetFormat), _ => {})
        }
        if(fs.existsSync(path.join(this.tempTarget, "download-metadata." + this.targetFormat))){
            fs.rm(path.join(this.tempTarget, "download-metadata." + this.targetFormat), _ => {})
        }
        if(fs.existsSync(path.join(this.tempTarget, "download-thumbnail." + this.targetFormat))){
            fs.rm(path.join(this.tempTarget, "download-thumbnail." + this.targetFormat), _ => {})
        }
        if(fs.existsSync(path.join(this.tempTarget, "thumb.png"))){
            fs.rm(path.join(this.tempTarget, "thumb.png"), _ => {})
        }

        invoke("downloader:progress:downloadComplete")
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
    registerIpcListener("downloader:startDownload", (_, url, format, target, fileType, metadata, thumbnail) => {
        let video = new YoutubeDlVideo(url)

        function end(){
            video.copyToEndTarget(_ => {
                video.cleanup()
            })
        }
        function applyThumbnail(){
            if(thumbnail){
                if(thumbnail.external){
                    video.downloadThumbnail(thumbnail.link, _ => {
                        end()
                    })
                }else{
                    video.applyThumbnail(thumbnail.link, _ => {
                        end()
                    })
                }
            }else{
                end()
            }
        }
        function applyMetadata(){
            if(metadata){
                video.applyMetadata(metadata, _ => {
                    applyThumbnail()
                })
            }else{
                applyThumbnail()
            }
        }

        video.download(format, target, fileType, _ => {
            applyMetadata()
        })
    })
    registerIpcListener("downloader:kill", _ => {
        killProcess()
    })
}

module.exports = {
    YoutubeDlVideo,
    registerListeners
}
