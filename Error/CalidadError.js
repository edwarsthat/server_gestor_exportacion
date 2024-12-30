class CalidadError extends Error {
    constructor(code, message) {
        super();
        this.name = "CalidadError"
        this.status = code
        this.message = message
    }
}



module.exports = {
    CalidadError,

}
