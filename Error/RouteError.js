
class pythonRouteError extends Error {
    constructor(code, message) {
        super();
        this.name = "Error con la conexion con el servidor python"
        this.status = code
        this.message = message
    }
}


module.exports = {
    pythonRouteError
}
