
class InventariosLogicError extends Error {
    constructor(code, message) {
        super();
        this.name = "Logica inventario error"
        this.status = code
        this.message = message
    }
}
class CalidadLogicError extends Error {
    constructor(code, message) {
        super();
        this.name = "Logica calidad error"
        this.status = code
        this.message = message
    }
}
class SistemaLogicError extends Error {
    constructor(code, message) {
        super();
        this.name = "Logica sistema error"
        this.status = code
        this.message = message
    }
}

module.exports = {
    InventariosLogicError,
    CalidadLogicError,
    SistemaLogicError
}
