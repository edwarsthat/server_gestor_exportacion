import { VariablesDelSistema } from "../../Class/VariablesDelSistema.js";

const obtenerEstadoDesdeAccionCanastillasInventario = (accion) => {
    const ESTADOS = {
        ingreso: "ENTREGADA",
        salida: "ENVIADA",
        traslado: "ENVIADA",
        retiro: "RETIRADA",
        cancelado: "CANCELADA"
        // Puedes agregar más si algún día decides que las canastillas también reencarnan
    };

    const estado = ESTADOS[accion?.toLowerCase()];

    if (!estado) {
        throw new Error(`Acción inválida para estado: '${accion}'. Estado no definido.`);
    }

    return estado;
};

const generadoresEF = {
    EF1: VariablesDelSistema.generarEF1,
    EF8: VariablesDelSistema.generarEF8
}

export {
    obtenerEstadoDesdeAccionCanastillasInventario,
    generadoresEF
};
