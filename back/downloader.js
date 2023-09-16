const { YoutubeDlPackage, FfmpegPackage } = require("./dependency-installer")
const { execFile } = require("child_process")
const { registerIpcListener, invoke } = require("./ipc-handler")
const { appDataDir } = require("./config")
const { downloadRequest } = require("./requests")
const path = require("path")
const fs = require("fs")
const {randomUUID} = require("crypto")


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
        this.uuid = randomUUID()
        this.url = url
        this.tempTarget = path.join(appDataDir, "targets")
        this.lastTarget = ""
        this.target = ""
        this._downloaded = false
        this.targetFormat = ""
    }
    getInfo(){
        const ytInfo = execFile(YoutubeDlPackage.executor, [
            "--dump-single-json",
            this.url
        ])
        return new Promise((resolve, reject) => {
            ytInfo.stdout.on("data", data => {
                try{
                    resolve(JSON.parse(data))
                }catch (e){
                    reject(e)
                }
            })
            ytInfo.stderr.on("data", data => {
                console.warn(data)
            })
        })
    }
    download(format, container, target, fileType, callback){
        log("Initialized downloader components...")
        log("Starting to download...")

        invoke("downloader:progress:info", "Starting download...")
        invoke("downloader:progress:mode", "stable")
        this.container = container
        this.target = target
        this.targetFormat = fileType
        this.lastTarget = `${this.uuid}-raw.${container}`

        const dwnOpts = [
            "-f", format,
            "-o", path.join(this.tempTarget, this.lastTarget),
            "--ffmpeg-location", FfmpegPackage.executor,
            "--audio-quality", "0",
            this.url
        ]

        YoutubeDlVideo.ytDlProcess(dwnOpts, _ => {
            this._downloaded = true
            callback()
        })
    }
    downloadPlaylist(format, target, fileType, embedMetadata, callback){
        log("Initialized downloader components...")
        log("Starting to download...")

        invoke("downloader:progress:info", "Starting download...")
        invoke("downloader:progress:mode", "stable")
        this.target = target
        this.targetFormat = fileType

        fs.mkdirSync(path.join(this.tempTarget, this.uuid))

        const dwnOpts = [
            "-f", format,
            "-P", path.join(this.tempTarget, this.uuid),
            "--ffmpeg-location", FfmpegPackage.executor
        ]
        if(embedMetadata){
            dwnOpts.push("--add-metadata")
        }
        dwnOpts.push(this.url)

        YoutubeDlVideo.ytDlProcess(dwnOpts, _ => {
            this._downloaded = true
            callback()
        })
    }
    convertPlaylist(callback){
        if(!this._downloaded) return

        log("Converting files to target format")
        invoke("downloader:progress:info", "Converting files...")
        invoke("downloader:progress:mode", "unstable")

        fs.mkdirSync(this.target, {recursive: true})

        let files = fs.readdirSync(path.join(this.tempTarget, this.uuid))
        let converted = 0
        for(let file of files){
            let convOptions = [
                "-y",
                "-i", path.join(this.tempTarget, this.uuid, file),
            ]
            let name = `${file.split(".").slice(0, -1).join(".")}.${this.targetFormat}`
            convOptions.push(path.join(this.target, name))
            YoutubeDlVideo.ffMpegProcess(convOptions, _ => {
                converted++
                log(`Converted ${converted} of ${files.length}`)
                if(converted === files.length){
                    callback()
                }
            })
        }
    }
    static ytDlProcess(options, callback){
        const ytDownload = execFile(YoutubeDlPackage.executor, options)
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
    simpleConvert(callback){
        if(
            (!this._downloaded || this.container === this.targetFormat)
        ) return

        log("Converting file to target format")
        invoke("downloader:progress:info", "Converting file...")
        invoke("downloader:progress:mode", "unstable")

        let convTarget = String(this.lastTarget)
        this.lastTarget = `${this.uuid}-converted.${this.targetFormat}`
        let convOptions = [
            "-y",
            "-i", path.join(this.tempTarget, convTarget),
            "-c", "copy",
            "-strict", "-2"
        ]
        convOptions.push(path.join(this.tempTarget, this.lastTarget))
        YoutubeDlVideo.ffMpegProcess(convOptions, callback)
    }
    applyMetadata(data, callback){
        if(!this._downloaded) return

        log("Applying metadata to file")
        invoke("downloader:progress:info", "Applying metadata...")
        invoke("downloader:progress:mode", "unstable")

        let convTarget = String(this.lastTarget)
        this.lastTarget = `${this.uuid}-metadata.` + this.targetFormat
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
        this.lastTarget = `${this.uuid}-thumbnail.` + this.targetFormat
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
        downloadRequest(url, path.join(this.tempTarget, `${this.uuid}-thumb.png`)).then(_ => {
            log("Thumbnail download completed")
            this.applyThumbnail(path.join(this.tempTarget, `${this.uuid}-thumb.png`), callback)
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

        for(let file of fs.readdirSync(this.tempTarget)){
            if(!file.startsWith(this.uuid)) continue
            fs.rm(path.join(this.tempTarget, file), {recursive: true})
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
    registerIpcListener("downloader:startDownload", (_, playlist, url, format, container, target, fileType, metadata, thumbnail) => {
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
        function simpleConvert(){
            if(metadata || thumbnail){
                applyMetadata()
            }else{
                video.simpleConvert(() => {
                    end()
                })
            }
        }

        if(playlist){
            video.downloadPlaylist(format, target, fileType, !!metadata, () => {
                video.convertPlaylist(() => {
                    video.cleanup()
                })
            })
        }else{
            video.download(format, container, target, fileType, _ => {
                simpleConvert()
            })
        }
    })
    registerIpcListener("downloader:kill", _ => {
        killProcess()
    })
}

module.exports = {
    YoutubeDlVideo,
    registerListeners
}
