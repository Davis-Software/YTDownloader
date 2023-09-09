const { platform, appDataDir, tempDir } = require("./config")
const requests = require("./requests")
const fs = require("fs")
const path = require("path")
const { JSDOM } = require("jsdom")
const StreamZip = require('node-stream-zip');
const {compare} = require("compare-versions");
const {ProgressBar} = require("./utility-windows");
const {exec} = require("child_process");


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

        this.url = "https://github.com/yt-dlp/yt-dlp/releases/latest"
        this.files = ["yt-dlp", "yt-dlp.exe"]
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
            let curr_tag = fs.existsSync(this.executor) ? this.config.tag : null
            this._getLatestTag(tag => {
                if(download && (curr_tag === null || compare(tag, curr_tag, ">"))){
                    let file = this.version === "unix" ? this.files[0] : this.files[1]
                    let url = this.url.split("/")
                    url.pop()
                    url.push("download", tag, file)
                    url = url.join("/")

                    new ProgressBar("yt-dlp Installer", 100, 0, (bar) => {
                        bar.setInfo("Downloading latest ffmpeg archive")

                        function progressCallback(event){
                            let percent = Math.round((event.loaded / event.total) * 100)
                            bar.setValue(percent)
                            bar.setText(`${percent}% completed`)
                        }

                        requests.downloadRequest(url, path.join(this.target, file), progressCallback).then(_ => {
                            bar.setValue(100)
                            this.makeExecutable(path.join(this.target, file), () => {
                                this.setConfigVal("tag", tag)
                                bar.striped(false)
                                bar.setText("yt-dlp update successful")
                                bar.setInfo(`yt-dlp is now at version: ${tag}`)
                                setTimeout(() => bar.close(), 2000)
                                resolve(tag)
                            })
                        })
                    }, {width: 500, height: 200, logVisible: false})
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

        this.url = "https://github.com/yt-dlp/FFmpeg-Builds/releases/latest"
        this.files = ["ffmpeg", "ffmpeg.exe"]
        this.url_files = ["ffmpeg-master-latest-linux64-gpl.tar.xz", "ffmpeg-master-latest-win64-gpl.zip"]
    }
    _getLatestTag(callback){
        requests.getRequest(this.url).then(resp => {
            let document = new JSDOM(resp.data).window.document
            let tag = document.querySelector("div a code.f5").textContent
                .replaceAll(" ", "")
                .replaceAll("\n", "")
            callback(tag)
        })
    }
    checkForUpdate(download){
        const unzipWin = (downloadLoc, outLoc, callback) => {
            let zip = new StreamZip({
                file: downloadLoc,
                storeEntries: true
            })
            zip.on("ready", () => {
                for(let entry in zip.entries()){
                    if(entry.includes(this.files[1])){
                        zip.extract(entry, path.join(outLoc, this.files[1]), (err, _) => {
                            if(err) return
                            callback()
                            zip.close()
                        })
                        break
                    }
                }
            })
        }
        const unzipUnix = (downloadLoc, outLoc, callback) => {
            let baseName = path.basename(downloadLoc).split(".")[0] + "/bin/ffmpeg"
            exec(`tar --strip-components=2 -C ${outLoc} -xf ${downloadLoc} ${baseName}`, (err, stdout, stderr) => {
                if(err) {
                    console.error(err, stdout, stderr)
                    return
                }
                callback()
            })
        }
        const unzip = (downloadLoc, outLoc, callback) => {
            let extractor = this.version === "unix" ? unzipUnix : unzipWin
            extractor(downloadLoc, outLoc, callback)
        }

        return new Promise(resolve => {
            let curr_tag = fs.existsSync(this.executor) ? this.config.tag : null

            this._getLatestTag(tag => {
                if(download && (curr_tag === null || tag !== curr_tag)){
                    let file = this.version === "unix" ? this.url_files[0] : this.url_files[1]

                    let temp_loc = path.join(tempDir, file)
                    fs.mkdirSync(temp_loc, {recursive: true})
                    let downloadedLoc = path.join(temp_loc, file)

                    let url = this.url.split("/")
                    url.pop()
                    url.push("download", "latest", file)
                    url = url.join("/")

                    new ProgressBar("ffmpeg Installer", 100, 0, (bar) => {
                        bar.setInfo("Downloading latest ffmpeg archive")

                        function progressCallback(event){
                            let percent = Math.round((event.loaded / event.total) * 100)
                            bar.setValue(percent)
                            bar.setText(`${percent}% completed`)
                        }

                        requests.downloadRequest(url, downloadedLoc, progressCallback).then(_ => {
                            bar.setText("working...")
                            bar.setInfo("Extracting ffmpeg archive")
                            bar.setValue(100)
                            bar.striped()
                            unzip(downloadedLoc, this.target, () => {
                                this.makeExecutable(path.join(this.target, file), () => {
                                    this.setConfigVal("tag", tag)
                                    bar.striped(false)
                                    bar.setText("ffmpeg update successful")
                                    bar.setInfo(`ffmpeg is now at version: ${tag}`)
                                    setTimeout(() => bar.close(), 2000)
                                    resolve(true)
                                })
                            })
                        })
                    }, {width: 500, height: 200, logVisible: false})
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


let installDir = path.join(appDataDir, "tools")
fs.mkdirSync(installDir, {
    recursive: true
})

module.exports = {
    YoutubeDlPackage: new YoutubeDlDependency(installDir),
    FfmpegPackage: new Ffmpeg(installDir)
}
