const { HandleErrors } = require("../../Error/recordErrors");


async function middleWareHandleErrors(err, req, res, next) {
    console.error("Error capturado:", err);
    const status = err.status || 500;
    const message = err.message || 'Error interno del servidor';

    await HandleErrors.addError(err, req.body.user)

    res.status(status).json({ status, message });
}

module.exports = {
    middleWareHandleErrors
};
