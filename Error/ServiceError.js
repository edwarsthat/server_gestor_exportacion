
class InventariosHistorialServiceError extends Error {
    constructor(message) {
        super();
        this.name = "Service inventario historial error"
        this.status = 481
        this.message = message
    }
}

class CalidadServiceError extends Error {
    constructor(message) {
        super();
        this.name = "Service Calidad error"
        this.status = 481
        this.message = message
    }
}

export { InventariosHistorialServiceError, CalidadServiceError }