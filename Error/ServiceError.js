
class InventariosHistorialServiceError extends Error {
    constructor(message) {
        super();
        this.name = "Service inventario historial error"
        this.status = 481
        this.message = message
    }
}

export { InventariosHistorialServiceError }