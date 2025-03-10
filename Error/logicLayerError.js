
class InventariosLogicError extends Error {
    constructor(code, message) {
        super();
        this.name = "Logica inventario error"
        this.status = code
        this.message = message
    }
}

module.exports = {
    InventariosLogicError
}
