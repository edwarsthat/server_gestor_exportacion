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