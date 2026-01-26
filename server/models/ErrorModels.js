export class ControllerError extends Error {
    constructor(status, message, type) {
        super(message);
        this.status = status;
        this.type = type;
        this.name = "ControllerError";
    }
}

export class MongoDBError extends Error {
    constructor(status, message, type) {
        super(message);
        this.status = status;
        this.type = type;
        this.name = "MongoDBError";
    }
}

export class UtilError extends Error {
    constructor(status, message, type) {
        super(message);
        this.status = status;
        this.type = type;
        this.name = "UtilError";
    }
}

export class ClassError extends Error {
    constructor(status, message, type, error) {
        super(message);
        this.status = status;
        this.type = type;
        this.name = "ClassError";
        this.error = error;
    }
}
