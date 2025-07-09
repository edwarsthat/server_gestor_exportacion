class ConnectionDBError extends Error {
    constructor(code, message) {
        super();
        this.name = "Connection DB error"
        this.status = code
        this.message = message
    }
}

class BadGetwayError extends Error {
    constructor(code, message) {
        super();
        this.name = "Bad getway error"
        this.status = code
        this.message = message
    }
}

class PostError extends Error {
    constructor(code, message) {
        super();
        this.name = "Post data error"
        this.status = code
        this.message = message
    }
}

class PutError extends Error {
    constructor(code, message) {
        super();
        this.name = "Put data error"
        this.status = code
        this.message = message
    }
}

class ConnectRedisError extends Error {
    constructor(code, message) {
        super();
        this.name = "Error redis connection"
        this.status = code
        this.message = message
    }
}

class ConnectAWS_Error extends Error {
    constructor(code, message) {
        super();
        this.name = "AWS Error"
        this.status = code
        this.message = message
    }
}

class PilaAccess_Error extends Error {
    constructor(code, message) {
        super();
        this.name = "Error en la pila de sincronizacion"
        this.status = code
        this.message = message
    }
}

class ErrorUndefinedData extends Error {
    constructor(code, message) {
        super();
        this.name = "Petición inválida: falta 'action'"
        this.status = code
        this.message = message
    }
}

class ErrorActionAlready extends Error {
    constructor(code, message) {
        super();
        this.name = "Acción en curso, por favor espera."
        this.status = code
        this.message = message
    }
}

class ErrorCatalog extends Error {
    constructor(code, message) {
        super();
        this.name = "Error conectando con catalogos"
        this.status = code
        this.message = message
    }
}

class ErrorSeriales extends Error {
    constructor(code, message) {
        super();
        this.name = "Error conectando con seriales"
        this.status = code
        this.message = message
    }
}

export {
    ConnectionDBError,
    BadGetwayError,
    PostError,
    PutError,
    ConnectRedisError,
    ConnectAWS_Error,
    PilaAccess_Error,
    ErrorUndefinedData,
    ErrorActionAlready,
    ErrorCatalog,
    ErrorSeriales
}