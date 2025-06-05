import { HandleErrors } from "../../Error/recordErrors.js";

async function middleWareHandleErrors(err, req, res, next) {
    console.error("Error capturado:", err);
    const status = err.status || 500;
    const message = err.message || 'Error interno del servidor';
    const user = (req.body && req.body.user) || null;

    await HandleErrors.addError(err, user)

    res.status(status).json({ status, message });
}

export {
    middleWareHandleErrors
};
