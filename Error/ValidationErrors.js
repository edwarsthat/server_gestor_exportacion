class ValidationUserError extends Error {
    constructor(code ,message){
        super();
        this.name = "ValidationError"
        this.status = code
        this.message = message
    }
}

class AccessError extends Error {
    constructor(code ,message){
        super();
        this.name = "Access error"
        this.status = code
        this.message = message
    }
}

class ValidationTokenError extends Error {
    constructor(code ,message){
        super();
        this.name = "ValidationError"
        this.status = code
        this.message = message
    }
}

export {
    ValidationUserError,
    ValidationTokenError,
    AccessError
}
