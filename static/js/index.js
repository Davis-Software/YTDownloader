function loadPage(page){
    fetch(`./views/${page}.html`).then(resp => {
        if(!resp.ok) return
        resp.text().then(data => {
            let main = document.querySelector("#main")
            let container = document.createElement("div")
            container.innerHTML = data

            container.querySelectorAll("script").forEach(elem => {
                let script = document.createElement("script")
                if(elem.hasAttribute("defer")){
                    script.setAttribute("defer", "")
                }
                if(elem.hasAttribute("src")){
                    script.setAttribute("src", elem.getAttribute("src"))
                }
                script.innerHTML = elem.innerHTML

                script.setAttribute("data-loaded-from", page)
                document.head.append(script)
                elem.remove()
            })
            container.querySelectorAll("link").forEach(elem => {
                let link = document.createElement("link")
                if(elem.getAttribute("rel") !== "stylesheet") return

                link.setAttribute("href", elem.getAttribute("href"))
                link.setAttribute("rel", "stylesheet")

                link.setAttribute("data-loaded-from", page)
                document.head.append(link)
                elem.remove()
            })

            main.innerHTML = container.innerHTML

            document.head.querySelectorAll("script, link").forEach(elem => {
                if(elem.hasAttribute("data-loaded-from") && elem.getAttribute("data-loaded-from") !== page){
                    elem.remove()
                }
            })
        })
    })
}


(function (){

    // Window frame controls
    {
        let minimizeBtn = document.querySelector(".frame-btn[data-action=min]")
        let closeBtn = document.querySelector(".frame-btn[data-action=close]")

        minimizeBtn.addEventListener("click", _ => {
            window.controls.minimize()
        })
        closeBtn.addEventListener("click", _ => {
            window.controls.close()
        })
    }

    // listener stuff
    window.ipc.update.onInfo((_, info) => {
        let modal = new Modal(null, {
            title: `New Update Available: Version ${info.version}`,
            close_button: {
                type: "info",
                text: "OK"
            },
            centered: true,
            scrollable: true
        }, "large")
        modal.Custom(info.releaseNotes).querySelectorAll("a").forEach(link => {
            link.addEventListener("click", e => {
                e.preventDefault()
                window.open(link.href, "_blank")
            })
        })
        modal.Text(
            "auto-update-info-text",
            "span",
            "The update will be downloaded in the background automatically!",
            "text-info position-absolute start-0 ps-3",
            {},
            true
        )
        modal.show()
    })

    // General init
    if(window.hasOwnProperty("identifier") && window.identifier === "dialog"){
        if(!window.hasOwnProperty("dialogType")) return
        loadPage(window.dialogType)
    }else{
        loadPage("downloader")
    }
})()
