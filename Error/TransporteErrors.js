export class TransporteError extends Error {
    constructor(code, message) {
        super();
        this.name = "TransporteError"
        this.status = code
        this.message = message
    }
}

