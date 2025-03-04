
function corsMiddle(req, res, next) {

    res.header('Access-Control-Allow-Origin', '*'); // Permite solicitudes de cualquier origen
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Métodos permitidos
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization'); // Encabezados permitidos
    // Maneja las solicitudes OPTIONS (pre-flight)
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next()
}

module.exports = { corsMiddle }
