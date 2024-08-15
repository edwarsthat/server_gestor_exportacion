class ProcessError extends Error {
    constructor(code ,message){
        super();
        this.name = "ProcessError"
        this.status = code
        this.message = message
    }
}

class ItemBussyError extends Error {
    constructor(code ,message){
        super();
        this.name = "Bussy item error"
        this.status = code
        this.message = message
    }
}


module.exports = {
    ProcessError,
    ItemBussyError
}
