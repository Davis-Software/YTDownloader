const axios = require("axios")
const https = require("https")
const qs = require("querystring")
const fs = require("fs")

const http_instance = axios.create({
    httpsAgent: new https.Agent(
        {
            rejectUnauthorized: true
        }
    )
})


function getRequest(url, data){
    return new Promise((resolve, reject) => {
        http_instance.get(url, {
            params: data
        }).then(resp => {
            resolve(resp)
        }).catch(err => {
            reject(err)
        })
    })
}
function postRequest(url, data){
    return new Promise((resolve, reject) => {
        http_instance.post(url, qs.stringify(data)).then(resp => {
            resolve(resp)
        }).catch(err => {
            reject(err)
        })
    })
}
function downloadRequest(url, target, progressCallback){
    return new Promise(async (resolve, reject) => {
        http_instance.get(url, {
            responseType: "stream",
            onDownloadProgress: progressCallback
        }).then(resp => {
            let writer = fs.createWriteStream(target)
            resp.data.pipe(writer)
            writer.on("finish", resolve)
            writer.on("error", reject)
        })
    })
}

module.exports = {
    getRequest,
    postRequest,
    downloadRequest
}
