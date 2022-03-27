const urlInput = document.querySelector("#dwn-url-input")
const urlInputPaste = document.querySelector("#dwn-url-paste")
const urlInputApply = document.querySelector("#dwn-url-apply")

const messageBox = document.querySelector("#messagebox")
const settings = document.querySelector("#settings")
const loader = document.querySelector("#loader")
const videoInfo = document.querySelector("#video-preview")
const videoDownload = document.querySelector("#video-download")

const messageBoxCollapse = new bootstrap.Collapse(messageBox.parentElement, {toggle: false})
const settingsCollapse = new bootstrap.Collapse(settings.parentElement)
const loaderCollapse = new bootstrap.Collapse(loader.parentElement, {toggle: false})
const videoInfoCollapse = new bootstrap.Collapse(videoInfo.parentElement, {toggle: false})
const videoDownloadCollapse = new bootstrap.Collapse(videoDownload.parentElement, {toggle: false})

const videoFormatSelector = document.querySelector("#format-selector #format-selector-video")
const videoFormatInfoBox = document.querySelector("#format-selector #format-info")
const videoPreviewContinue = document.querySelector("#video-preview-continue")

const videoFileTypeSelector = document.querySelector("#output-filetype-select")
const outputLocationInput = document.querySelector("#output-location-selector")

const downloadOptionsCollapse = new bootstrap.Collapse(
    document.querySelector("#download-options").parentElement,
    {toggle: false}
)

const downloadOptionsCustomFilenameCheckbox = document.querySelector("#download-options-custom-filename")
const downloadOptionsCustomFilenameCollapse = new bootstrap.Collapse(
    downloadOptionsCustomFilenameCheckbox.parentElement.parentElement.querySelector(".collapse"),
    {toggle: false}
)
const downloadOptionsCustomFilenameInput = document.querySelector("#download-options-custom-filename-input")
const downloadOptionsSongModeCheckbox = document.querySelector("#download-options-songMode")
const downloadOptionsSongModeCollapse = new bootstrap.Collapse(
    downloadOptionsSongModeCheckbox.parentElement.parentElement.querySelector(".collapse"),
    {toggle: false}
)
const downloadOptionsSongModeArtistInput = document.querySelector("#download-options-songMode-artist")
const downloadOptionsSongModeTitleInput = document.querySelector("#download-options-songMode-title")
const downloadOptionsSongModeAffectsFileName = document.querySelector("#download-options-songMode-filename")

const downloadOptionsApplyThumbnail = document.querySelector("#download-options-thumbnail")
const downloadOptionsApplyThumbnailCollapse = new bootstrap.Collapse(
    downloadOptionsApplyThumbnail.parentElement.nextElementSibling,
    {toggle: false}
)
const downloadOptionsApplyThumbnailPreview = document.querySelector("#download-options-thumbnail-preview")
const downloadOptionsApplyThumbnailCustomCheckbox = document.querySelector("#download-options-custom-thumbnail")
const downloadOptionsApplyThumbnailCustomInput = document.querySelector("#download-options-custom-thumbnail-input")

const downloadOptionsBack = document.querySelector("#download-options-back")
const downloadOptionsStart = document.querySelector("#download-options-start")

const downloadProgress = document.querySelector("#download-progress")
const downloadProgressCollapse = new bootstrap.Collapse(downloadProgress.parentElement, {toggle: false})
const downloadProgressBar = document.querySelector("#download-progress-bar .progress-bar")
const downloadProgressInfo = document.querySelector("#download-progress-info")
const downloadProgressAbortButton = document.querySelector("#download-abort")
const downloadProgressLog = document.querySelector("#download-log ul")

let applied = false
let videoInfoData

let selectedDownloadFormat
let selectedDownloadOutputMode
let selectedDownloadOutputFileType
let selectedDownloadOutputFilePath
let selectedDownloadOutputFile

let selectedThumbnail


function resetEverything(ignoreMessageBox=false, showSettings=true){
    applied = false

    urlInput.disabled = false
    urlInputPaste.disabled = false
    urlInputApply.classList.remove("btn-warning", "btn-info", "btn-success")
    urlInputApply.classList.add("btn-primary")
    urlInputApply.textContent = "Apply"
    urlInputApply.disabled = false

    if(!ignoreMessageBox) {
        messageBoxCollapse.hide()
    }
    loaderCollapse.hide()
    videoInfoCollapse.hide()
    videoDownloadCollapse.hide()

    if(showSettings){
        settingsCollapse.show()
    }else{
        settingsCollapse.hide()
    }
}
function errorOut(title, message){
    resetEverything(true, false)
    messageBox.querySelector("h5").textContent = title
    messageBox.querySelector("p").innerText = message

    window.controls.setProgressBar(0)
    window.controls.flashFrame(true)

    messageBoxCollapse.show()
}
messageBox.querySelector("button").addEventListener("click", _ => {
    messageBoxCollapse.hide()

    if(!loaderCollapse._isShown() && !videoInfoCollapse._isShown() && !videoDownloadCollapse._isShown()){
        settingsCollapse.show()
    }
})


function humanFileSize(bytes, dp=1) {
    let thresh = 1024
    if (Math.abs(bytes) < thresh) return bytes + ' B'
    let units = ['kB', 'MB', 'GB', 'TB']
    let u = -1
    let r = 10**dp
    do {
        bytes /= thresh
        ++u
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1)
    return bytes.toFixed(dp) + ' ' + units[u]
}
function formatVideoFormat(formatObj){
    return `
        ${formatObj.format_note}
         -> ${formatObj.width}x${formatObj.height}
         [Audio: ${formatObj.acodec}]
         (${humanFileSize(formatObj.filesize)})
    `.replaceAll("\n", "")
}
function formatAudioFormat(formatObj){
    return `
        audio only ->
         ${formatObj.acodec}-${formatObj.asr}
         (${humanFileSize(formatObj.filesize)})
    `.replaceAll("\n", "")
}


urlInputPaste.addEventListener("click", _ => {
    navigator.clipboard.readText().then(result => {
        if(!result) return
        urlInput.value = result
    })
})
urlInputApply.addEventListener("click", _ => {
    if(urlInputApply.disabled) return
    if(applied){
        resetEverything()
        applied = false
    }else{
        if(urlInput.value === ""){
            errorOut("Invalid Input Error", "Please provide a video url")
            return;
        }

        messageBoxCollapse.hide()
        settingsCollapse.hide()
        videoInfoCollapse.hide()
        videoDownloadCollapse.hide()

        applied = true
        urlInput.disabled = true
        urlInputPaste.disabled = true
        urlInputApply.classList.replace("btn-primary", "btn-info")
        urlInputApply.innerHTML = "<div class='spinner-border spinner-border-sm'></div>"
        urlInputApply.disabled = true

        window.downloader.getInfo(urlInput.value, _ => {
            window.controls.setProgressBar(2)

            videoInfo.querySelector("img").src = ""
            videoInfo.querySelector("#video-title").textContent = ""
            videoInfo.querySelector("#video-creator").textContent = ""
            videoInfo.querySelector("#video-likes").textContent = ""
            videoInfo.querySelector("#video-views").textContent = ""
            videoInfo.querySelector("#video-description").innerText = ""

            videoInfo.querySelectorAll("#video-categories span").forEach(elem => {
                elem.remove()
            })
            videoFormatSelector.querySelectorAll("optgroup[label=All] option").forEach(elem => {
                elem.remove()
            })
            videoFormatSelector.querySelector("option[disabled]").selected = true
            videoFormatInfoBox.textContent = ""
            videoPreviewContinue.disabled = true

            videoFileTypeSelector.querySelector("option[disabled]").selected = true
            outputLocationInput.value = ""
            outputLocationInput.parentElement.querySelector("button").disabled = true

            downloadOptionsCollapse.hide()
            downloadOptionsCustomFilenameCollapse.hide()
            downloadOptionsCustomFilenameCheckbox.checked = false
            downloadOptionsCustomFilenameInput.value = ""
            downloadOptionsSongModeCollapse.hide()
            downloadOptionsSongModeCheckbox.checked = false
            downloadOptionsSongModeArtistInput.value = ""
            downloadOptionsSongModeTitleInput.value = ""
            downloadOptionsSongModeAffectsFileName.checked = true

            downloadOptionsApplyThumbnail.checked = false
            downloadOptionsApplyThumbnailPreview.src = ""
            downloadOptionsApplyThumbnailCustomCheckbox.checked = false
            downloadOptionsApplyThumbnailCustomInput.disabled = true

            downloadProgressCollapse.hide()
            downloadProgressBar.style.width = "0"
            downloadProgressBar.textContent = ""
            downloadProgressBar.classList.remove("progress-bar-animated", "progress-bar-striped")
            downloadProgressInfo.textContent = ""

            videoFileTypeSelector.disabled = false
            outputLocationInput.parentElement.querySelector("button").disabled = false
            downloadProgressAbortButton.disabled = true

            loaderCollapse.show()
        })
    }
})
window.downloader.on("returnInfo", (_, info) => {
    window.controls.setProgressBar(-1)

    function isYoutube(){
        return info.webpage_url.includes("https://youtube.com/")
    }

    urlInputApply.textContent = "Change"
    urlInputApply.classList.replace("btn-info", "btn-warning")
    urlInputApply.disabled = false

    loaderCollapse.hide()
    videoInfoCollapse.show()

    videoInfo.querySelector("img").src = info?.thumbnail
    videoInfo.querySelector("#video-title").textContent = info?.title || "No title"

    videoInfo.querySelector("#video-creator").textContent = isYoutube()
        ? info.channel
        : info?.uploader || "Unknown"
    videoInfo.querySelector("#video-likes").textContent = info?.like_count || "Unknown"
    videoInfo.querySelector("#video-views").textContent = info?.view_count || "Unknown"
    videoInfo.querySelector("#video-description").innerText = info?.description || "No Video description"

    for(let category of info?.categories || ["No categories"]){
        let elem = document.createElement("span")
        elem.classList.add("badge", "rounded-pill", "bg-secondary")
        elem.textContent = category
        videoInfo.querySelector("#video-categories").append(elem)
    }

    for(let format of info.formats){
        let elem = document.createElement("option")
        elem.value = format.format_id
        elem.textContent = format.width ? formatVideoFormat(format) : formatAudioFormat(format)
        videoFormatSelector.querySelector("optgroup[label=All]").append(elem)
    }

    // DownloadOptions
    downloadOptionsCustomFilenameInput.value = info?.title || ""
    if((info?.title || "").includes("-")){
        downloadOptionsSongModeArtistInput.value = info.title.split("-")[0]
        downloadOptionsSongModeTitleInput.value = info.title.split("-")[1]
    }else{
        downloadOptionsSongModeArtistInput.value = isYoutube()
            ? info.channel
            : info?.uploader || "Unknown"
        downloadOptionsSongModeTitleInput.value = info?.title || "output"
    }
    selectedThumbnail = info?.thumbnail
    downloadOptionsApplyThumbnailPreview.src = selectedThumbnail

    videoInfoData = info
})
videoPreviewContinue.disabled = true
videoFormatSelector.addEventListener("input", _ => {
    if(videoFormatSelector.value.includes("preset-max")){
        function getFormatObjFromId(formatId){
            for(let format of videoInfoData.formats){
                if(format.format_id === formatId.toString()){
                    return format
                }
            }
            return null
        }

        let formatTarget = videoInfoData.format_id.split("+")
        let videoFormat = formatTarget[0]
        let audioFormat = formatTarget.pop()

        let selectedFormatObj
        switch (videoFormatSelector.value.split("preset-")[1]){
            case "max-video":
                selectedDownloadFormat = videoFormat
                selectedDownloadOutputMode = "video"

                selectedFormatObj = getFormatObjFromId(videoFormat)
                videoFormatInfoBox.innerText = `Video: ${formatVideoFormat(selectedFormatObj)}\nAudio: None`
                break
            case "max-audio":
                selectedDownloadFormat = audioFormat
                selectedDownloadOutputMode = "audio"

                selectedFormatObj = getFormatObjFromId(audioFormat)
                videoFormatInfoBox.innerText = `Video: None\nAudio: ${formatAudioFormat(selectedFormatObj)}`
                break
            default:
                selectedDownloadFormat = videoInfoData.format_id
                selectedDownloadOutputMode = "normal"

                let selectedVideoFormatObj = getFormatObjFromId(videoFormat)
                let selectedAudioFormatObj = getFormatObjFromId(audioFormat)
                videoFormatInfoBox.innerText = `Video: ${formatVideoFormat(selectedVideoFormatObj)}\nAudio: ${formatAudioFormat(selectedAudioFormatObj)}`
                break
        }
    }else{
        selectedDownloadFormat = videoFormatSelector.value
        selectedDownloadOutputMode = "custom"
        videoFormatInfoBox.textContent = ""
    }
    videoPreviewContinue.disabled = false
})

videoPreviewContinue.addEventListener("click", _ => {
    if(videoPreviewContinue.disabled) return

    function resetSelection(){
        videoFileTypeSelector.querySelector("option[disabled]").selected = true
        outputLocationInput.parentElement.querySelector("button").disabled = true
        selectedDownloadOutputFileType = null
        downloadOptionsCollapse.hide()
    }
    function getSelected(){
        for (let elem of videoFileTypeSelector.querySelectorAll("option")){
            if(elem.getAttribute("value") === videoFileTypeSelector.value){
                return elem
            }
        }
        return videoFileTypeSelector.querySelector("option[disabled]")
    }
    switch (selectedDownloadOutputMode){
        case "video":
        case "normal":
            videoFileTypeSelector.querySelector("optgroup[label=Video]").disabled = false
            videoFileTypeSelector.querySelector("optgroup[label=Audio]").disabled = true
            if(getSelected().parentElement.getAttribute("label") !== "Video"){
                resetSelection()
            }
            break
        case "audio":
            videoFileTypeSelector.querySelector("optgroup[label=Video]").disabled = true
            videoFileTypeSelector.querySelector("optgroup[label=Audio]").disabled = false
            if(getSelected().parentElement.getAttribute("label") !== "Audio"){
                resetSelection()
            }
            break
        default:
            videoFileTypeSelector.querySelector("optgroup[label=Video]").disabled = false
            videoFileTypeSelector.querySelector("optgroup[label=Audio]").disabled = false
            break
    }

    videoInfoCollapse.hide()
    videoDownloadCollapse.show()
})
downloadOptionsBack.addEventListener("click", _ => {
    videoDownloadCollapse.hide()
    videoInfoCollapse.show()
})
videoFileTypeSelector.addEventListener("input", _ => {
    outputLocationInput.parentElement.querySelector("button").disabled = false
    selectedDownloadOutputFileType = videoFileTypeSelector.value
    updateDownloadOutputLocation()
})
outputLocationInput.parentElement.querySelector("button").addEventListener("click", _ => {
    if(outputLocationInput.parentElement.querySelector("button").disabled) return
    window.dialog.showDialog({
        title: "Select an output folder",
        buttonLabel: "Choose Folder",
        properties: ["openDirectory"]
    }, "selectLocation")
})
function updateDownloadOutputLocation(){
    if(!selectedDownloadOutputFilePath) return

    downloadOptionsCollapse.show()
    let addition = videoInfoData?.title || "unknown"
    if(downloadOptionsCustomFilenameCheckbox.checked){
        downloadOptionsSongModeAffectsFileName.disabled = true
        downloadOptionsSongModeAffectsFileName.checked = false
        addition = downloadOptionsCustomFilenameInput.value
    }else if(
        downloadOptionsSongModeCheckbox.checked
        && (downloadOptionsSongModeAffectsFileName.checked || downloadOptionsSongModeAffectsFileName.disabled)
    ){
        downloadOptionsSongModeAffectsFileName.disabled = false
        downloadOptionsSongModeAffectsFileName.checked = true
        addition = `${downloadOptionsSongModeArtistInput.value} - ${downloadOptionsSongModeTitleInput.value}`
    }

    addition += `.${selectedDownloadOutputFileType}`

    selectedDownloadOutputFile = window.utils.path.join(selectedDownloadOutputFilePath, addition)
    outputLocationInput.value = selectedDownloadOutputFile
}
window.dialog.on("showDialogResponse:selectLocation", (_, response) => {
    if(response.canceled) return
    selectedDownloadOutputFilePath = response.filePaths[0]

    updateDownloadOutputLocation()
    downloadOptionsCollapse.show()
})
function setDownloadOptionsCustomFilenameCollapseState(){
    if(downloadOptionsCustomFilenameCheckbox.checked === downloadOptionsCustomFilenameCollapse._isShown()) return
    if(downloadOptionsCustomFilenameCheckbox.checked){
        downloadOptionsCustomFilenameCollapse.show()
    }else{
        downloadOptionsCustomFilenameCollapse.hide()
    }
    updateDownloadOutputLocation()
}
downloadOptionsCustomFilenameCheckbox.addEventListener("input", setDownloadOptionsCustomFilenameCollapseState)
setInterval(setDownloadOptionsCustomFilenameCollapseState, 250)
function setDownloadOptionsSongModeCollapseState(){
    if(downloadOptionsSongModeCheckbox.checked === downloadOptionsSongModeCollapse._isShown()) return
    if(downloadOptionsSongModeCheckbox.checked){
        downloadOptionsSongModeCollapse.show()
    }else{
        downloadOptionsSongModeCollapse.hide()
    }
    updateDownloadOutputLocation()
}
downloadOptionsSongModeCheckbox.addEventListener("input", setDownloadOptionsSongModeCollapseState)
setInterval(setDownloadOptionsSongModeCollapseState, 250)

downloadOptionsCustomFilenameInput.addEventListener("input", updateDownloadOutputLocation)
downloadOptionsSongModeArtistInput.addEventListener("input", updateDownloadOutputLocation)
downloadOptionsSongModeTitleInput.addEventListener("input", updateDownloadOutputLocation)
downloadOptionsSongModeAffectsFileName.addEventListener("input", updateDownloadOutputLocation)

downloadOptionsApplyThumbnail.addEventListener("input", setDownloadOptionsApplyThumbnailCollapseState)
setInterval(setDownloadOptionsApplyThumbnailCollapseState, 250)
function setDownloadOptionsApplyThumbnailCollapseState(){
    if(downloadOptionsApplyThumbnail.checked === downloadOptionsApplyThumbnailCollapse._isShown()) return
    if(downloadOptionsApplyThumbnail.checked){
        downloadOptionsApplyThumbnailCollapse.show()
    }else{
        downloadOptionsApplyThumbnailCollapse.hide()
    }
}
function updateApplyThumbnailPreview(){
    if(downloadOptionsApplyThumbnailCustomCheckbox.checked){
        downloadOptionsApplyThumbnailPreview.src = selectedThumbnail
    }else{
        selectedThumbnail = videoInfoData?.thumbnail
        downloadOptionsApplyThumbnailPreview.src = selectedThumbnail
    }
}
downloadOptionsApplyThumbnailCustomCheckbox.addEventListener("input", _ => {
    downloadOptionsApplyThumbnailCustomInput.disabled = !downloadOptionsApplyThumbnailCustomCheckbox.checked
    updateApplyThumbnailPreview()
})
downloadOptionsApplyThumbnailCustomInput.addEventListener("click", _ => {
    window.dialog.showDialog({
        title: "Select a custom thumbnail",
        buttonLabel: "Choose File",
        properties: ["openFile"],
        filters: [
            {name: 'Image (png, jpg, jpeg)', extensions: ['png', "jpg", "jpeg"]}
        ]
    }, "chooseThumbnail")
})
window.dialog.on("showDialogResponse:chooseThumbnail", (_, resp) => {
    if(resp.canceled) return
    selectedThumbnail = resp.filePaths[0]
    updateApplyThumbnailPreview()
})

downloadOptionsStart.addEventListener("click", _ => {
    downloadOptionsCollapse.hide()
    downloadProgressCollapse.show()

    let metadata = downloadOptionsSongModeCheckbox.checked
        ? {
            title: downloadOptionsSongModeTitleInput.value,
            artist: downloadOptionsSongModeArtistInput.value,
            author: downloadOptionsSongModeArtistInput.value
        }
        : null

    let thumbnail = downloadOptionsApplyThumbnail.checked
        ? {
            external: !downloadOptionsApplyThumbnailCustomCheckbox.checked,
            link: selectedThumbnail
        }
        : null

    window.downloader.startDownload(
        urlInput.value,
        selectedDownloadFormat,
        selectedDownloadOutputFile,
        selectedDownloadOutputFileType,
        metadata,
        thumbnail
    )
})
window.downloader.on("progress:info", (_, info) => {
    downloadProgressBar.textContent = info

    videoFileTypeSelector.disabled = true
    outputLocationInput.parentElement.querySelector("button").disabled = true
    downloadProgressAbortButton.disabled = false

    downloadProgressInfo.textContent = ""
})
window.downloader.on("progress:mode", (_, mode) => {
    switch (mode){
        case "unstable":
            downloadProgressBar.style.width = "100%"
            downloadProgressBar.classList.add("progress-bar-striped", "progress-bar-animated", "bg-info")
            window.controls.setProgressBar(2)
            break
        case "stable":
        default:
            downloadProgressBar.style.width = "0"
            downloadProgressBar.classList.remove("progress-bar-striped", "progress-bar-animated", "bg-info")
    }
})
window.downloader.on("progress:data", (_, data) => {
    downloadProgressBar.textContent = `${data.progress}%`
    downloadProgressBar.style.width = `${data.progress}%`
    downloadProgressInfo.innerText =
        `
            Downloaded ${Math.round(data.transferred * 100)/100}MiB of ${data.size}
            Downloading with ${data.speed}
            Estimated time left: ${data.estimated}
        `
    window.controls.setProgressBar(data.progress/100)
})
window.downloader.on("progress:downloadComplete", _ => {
    window.controls.setProgressBar(0)
    downloadProgressAbortButton.disabled = true
    downloadProgressInfo.textContent = "Download finished"
})
downloadProgressAbortButton.addEventListener("click", _ => {
    if(downloadProgressAbortButton.classList.contains("btn-info")){
        downloadProgressAbortButton.classList.replace("btn-info", "btn-warning")
        downloadProgressAbortButton.textContent = "Abort Download"
        downloadProgressCollapse.hide()
        downloadOptionsCollapse.show()
    }else {
        window.downloader.killDownload()
    }
})
window.downloader.on("progress:downloadAborted", _ => {
    window.controls.setProgressBar(0)
    downloadProgressAbortButton.classList.replace("btn-warning", "btn-info")
    downloadProgressAbortButton.textContent = "Go Back"
    downloadProgressInfo.textContent = "Download aborted"
})
window.downloader.on("progress:log", (_, data) => {
    let logElem = document.createElement("li")
    logElem.textContent = data.message
    logElem.classList.add(data.tag)
    downloadProgressLog.append(logElem)
    downloadProgressLog.scrollTo(0, downloadProgressLog.scrollHeight)
})



// Temporary dev stuff
setTimeout(_ => {
    // urlInput.value = "https://www.youtube.com/watch?v=Rp8_5W76AT0"
    // urlInputApply.click()

    // settingsCollapse.hide()
    // selectedDownloadFormat = "123"
    // selectedDownloadOutputMode = "custom"
    // videoDownloadCollapse.show()
    // downloadProgressCollapse.show()
}, 500)


window.downloader.on("error", (_, err) => {
    errorOut("Error", err.stderr)
})