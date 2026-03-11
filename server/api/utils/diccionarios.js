
const obtenerEstadoDesdeAccionCanastillasInventario = (accion) => {
    const ESTADOS = {
        ingreso: "ENTREGADA",
        salida: "ENVIADA",
        traslado: "ENVIADA",
        retiro: "RETIRADA",
        cancelado: "CANCELADA",
        creacion: "CREADA"
    };

    const estado = ESTADOS[accion?.toLowerCase()];

    if (!estado) {
        throw new Error("Estado no definido.");
    }

    return estado;
};



export {
    obtenerEstadoDesdeAccionCanastillasInventario,
};
