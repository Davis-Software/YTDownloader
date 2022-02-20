const { app } = require("electron")
const path = require("path")


exports.platform = process.platform === "win32" ? "win32" : "unix"
exports.iconPath = path.join(__dirname, "..", "static", "logo", "512x512" + (exports.platform === "win32" ? ".ico" : ".png"))

exports.appDataDir = app.getPath("userData")

exports.devMode = false
