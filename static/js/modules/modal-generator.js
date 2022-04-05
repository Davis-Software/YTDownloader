class Modal{
    static slim_modal_body = `
        <div class="modal fade" id="modal_id" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">modal_title</h5>
                    </div>
                    <div class="modal-body"></div>
                    <div class="modal-footer"></div>
                </div>
            </div>
        </div>
    `
    static basic_modal_body = `
        <div class="modal fade" id="modal_id" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">modal_title</h5>
                        <button class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body"></div>
                    <div class="modal-footer"></div>
                </div>
            </div>
        </div>
    `
    constructor(wrapper_selector, options={}, size="normal"){
        if(!wrapper_selector){
            this.root = document.createElement("div")
            document.body.appendChild(this.root)
        }else{
            this.root = document.querySelector(wrapper_selector)
        }

        this.id = options.id || Math.random().toString(16).substr(2, 8)
        this.title = options.title || "Modal"
        this.close_button = options.close_button || false

        this.template = options.template || Modal.basic_modal_body
        this.centered = options.centered || false
        this.scrollable = options.scrollable || false
        this.static_backdrop = options.static_backdrop || false

        this.root.innerHTML = this.template
            .replaceAll("modal_id", this.id)
            .replaceAll("modal_title", this.title)

        this.wrapper = document.getElementById(this.id)
        this.wrapper_config = this.wrapper.querySelector(".modal-dialog")
        this.wrapper_body = this.wrapper.querySelector(".modal-body")
        this.wrapper_footer = this.wrapper.querySelector(".modal-footer")

        if(this.close_button){
            let btn = document.createElement("button")
            btn.setAttribute("class", "btn btn-danger")
            btn.setAttribute("data-bs-dismiss", "modal")
            if(typeof this.close_button === "string") {
                btn.innerHTML = this.close_button
            }
            else if(typeof  this.close_button === "object"){
                btn.setAttribute("class", `btn btn-${this.close_button.type}`)
                btn.innerHTML = this.close_button.text
            }else{
                btn.innerText = "Close"
            }
            this.wrapper_footer.appendChild(btn)
            this.close_button = btn
        }

        if(this.centered){
            this.wrapper_config.classList.add("modal-dialog-centered")
        }

        if(this.scrollable){
            this.wrapper_config.classList.add("modal-dialog-scrollable")
        }

        if(this.static_backdrop){
            this.wrapper.setAttribute("data-bs-backdrop", "static")
            this.wrapper.setAttribute("data-bs-keyboard", "false")
        }

        switch(size){
            case "small": this.wrapper_config.classList.add("modal-sm"); break
            case "normal": break
            case "large": this.wrapper_config.classList.add("modal-lg"); break
            case "huge": this.wrapper_config.classList.add("modal-xl"); break
            case "max": this.wrapper_config.classList.add("modal-xxl"); break
            default: this.wrapper_config.classList.add(size); break
        }
    }
    SetOptions(options={}){
        for(let option in options) {
            let value = options[option]
            switch (option) {
                case "title": {
                    this.wrapper.querySelector(".modal-title").innerText = value
                    break
                }
                default: {
                    console.error("Provided invalid option")
                    break
                }
            }
        }
        return this
    }

    _AppendElement(elem, footer){
        if(footer){
            this.wrapper_footer.appendChild(elem)
        }else{
            this.wrapper_body.appendChild(elem)
        }
    }
    _CustomAttrs(elem, attrs){
        for(let attr in attrs){
            elem.setAttribute(attr, attrs[attr])
        }
    }
    _GetInstance(){
        return bootstrap.Modal.getOrCreateInstance(this.wrapper)
    }

    Button(id, text, classes="", attributes={}, footer=false){
        let btn = document.createElement("button")
        btn.id = id
        btn.setAttribute("class", `btn ${classes}`)
        btn.innerHTML = text
        this._CustomAttrs(btn, attributes)
        this._AppendElement(btn, footer)
        return btn
    }
    Input(id, type, classes="", attributes= {}, footer=false){
        let inp = document.createElement("input")
        inp.id = id
        inp.type = type
        inp.setAttribute("class", `form-control ${classes}`)
        this._CustomAttrs(inp, attributes)
        this._AppendElement(inp, footer)
        return inp
    }
    TextArea(id, classes="", attributes= {}){
        let text_area = document.createElement("textarea")
        text_area.id = id
        text_area.setAttribute("class", `form-control ${classes}`)
        this._CustomAttrs(text_area, attributes)
        this.wrapper_body.appendChild(text_area)
        return text_area
    }
    Text(id, tag="span", text, classes="", attributes= {}, footer=false){
        let span = document.createElement(tag)
        span.id = id
        span.innerText = text
        span.setAttribute("class", classes)
        this._CustomAttrs(span, attributes)
        this._AppendElement(span, footer)
        return span
    }
    FastText(text, attributes={}, footer=false){
        let span = document.createElement("span")
        span.id = Math.random().toString()
        span.innerText = text
        this._CustomAttrs(span, attributes)
        this._AppendElement(span, footer)
        return span
    }
    Custom(html, tag="div", footer=false){
        let elem = document.createElement(tag)
        elem.id = Math.random().toString()
        elem.innerHTML = html
        this._AppendElement(elem, footer)
        return elem
    }
    show(){
        this._GetInstance().show()
    }
    on(event, callback){
        this.wrapper.addEventListener(`${event}.bs.modal`, callback)
    }
    hide(){
        this._GetInstance().hide()
    }
    clear(){
        this.wrapper_body.innerHTML = ""
        this.wrapper_footer.innerHTML = ""
        return this
    }
    destroy(){
        this.hide()
        // document.querySelectorAll(".modal-backdrop").forEach(e => {
        //     document.removeChild(e)
        // })
        // document.removeChild(this.wrapper)
    }
}
