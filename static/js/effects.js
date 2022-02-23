function createRipple(elem) {
    if(elem.classList.contains("ripple-legacy")) return

    elem.classList.add("mad-ripple")
    elem.addEventListener("mousedown", e => {
        if(elem.classList.contains(".disabled")) {
            return
        }

        function getElementOffset(element){
            let de = document.documentElement
            let box = element.getBoundingClientRect()
            let top = box.top + window.pageYOffset - de.clientTop
            let left = box.left + window.pageXOffset - de.clientLeft
            return { top, left }
        }

        let offs = getElementOffset(elem)
        let x = e.pageX - offs.left
        let y = e.pageY - offs.top
        let dia = Math.min(elem.offsetHeight, elem.offsetWidth, 100)
        let ripple = document.createElement("div")
        ripple.classList.add("ripple-inner")
        elem.append(ripple)

        let rippleWave = document.createElement("div")
        rippleWave.classList.add("rippleWave")
        rippleWave.style.left = (x - dia/2).toString() + "px"
        rippleWave.style.top = (y - dia/2).toString() + "px"
        rippleWave.style.width = dia.toString() + "px"
        rippleWave.style.height = dia.toString() + "px"

        ripple.append(rippleWave)
        rippleWave.addEventListener("animationend", _ => {
            ripple.remove()
        })
    })
}

{
    document.querySelectorAll(".btn, .dropdown-item, .card-header, .ripple, .mad-ripple").forEach(elem => {
        elem.classList.add("ripple")
        createRipple(elem)
    })
    document.addEventListener("click", _ => {
        document.querySelectorAll(".btn:not(.ripple), .dropdown-item:not(.ripple), .card-header:not(.ripple)").forEach(elem => {
            elem.classList.add("ripple")
            createRipple(elem)
        })
    })
}