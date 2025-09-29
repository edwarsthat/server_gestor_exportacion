
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


class ComercialLogicError extends Error {
    constructor(code, message) {
        super();
        this.name = "Logica comercial error"
        this.status = code
        this.message = message
    }
}

class DataLogicError extends Error {
    constructor(code, message) {
        super();
        this.name = "Logica data error"
        this.status = code
        this.message = message
    }
}

class GestionCuentasLogicError extends Error {
    constructor(code, message) {
        super();
        this.name = "Logica gestion de cuentas error"
        this.status = code
        this.message = message
    }
}
class ContabilidadLogicError extends Error {
    constructor(code, message) {
        super();
        this.name = "Logica contabilidad error"
        this.status = code
        this.message = message
    }
}
class ProcesoLogicError extends Error {
    constructor(code, message) {
        super();
        this.name = "Logica proceso error"
        this.status = code
        this.message = message
    }
}


export {
    InventariosLogicError,
    CalidadLogicError,
    SistemaLogicError,
    ComercialLogicError,
    DataLogicError,
    GestionCuentasLogicError,
    ContabilidadLogicError,
    ProcesoLogicError
}
