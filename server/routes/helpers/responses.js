

function successResponseRoutes(data = null) {
    return { status: 200, message: 'Ok', data };
}

function errorResponseRoutes(error) {
    const status = error.status || 500;
    const message = error.message || 'Internal Server Error';
    return { status, message };
}

export {
    successResponseRoutes,
    errorResponseRoutes,
};
