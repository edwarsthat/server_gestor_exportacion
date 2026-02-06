
export const crear_arreglo_modificar_descartes = (newData) => {
    if (newData.size === 0) {
        throw new Error("No se puede modificar más inventario de descarte que el disponible");
    }
    const out = {};
    for (const [key, value] of newData) {
        const [area, descarteId] = key.split(":");
        if (value.kilos !== undefined) {
            if (out[`${area}:${descarteId}:kilos`] === undefined) {
                out[`${area}:${descarteId}:kilos`] = {};
            }
            out[`${area}:${descarteId}:kilos`] = value.kilos.value;
        }

        if (value.canastillas !== undefined) {
            if (out[`${area}:${descarteId}:canastillas`] === undefined) {
                out[`${area}:${descarteId}:canastillas`] = {};
            }
            out[`${area}:${descarteId}:canastillas`] = value.canastillas.value;
        }
    }
    return out;
}

export const crear_arreglo_modificar_descartes_sumar = (newData) => {
    if (newData.size === 0) {
        throw new Error("No se puede modificar más inventario de descarte que el disponible");
    }
    const out = {};
    for (const [key, value] of newData) {
        const [area, descarteId] = key.split(":");
        if (value.kilos !== undefined) {
            if (out[`${area}:${descarteId}:kilos`] === undefined) {
                out[`${area}:${descarteId}:kilos`] = {};
            }
            out[`${area}:${descarteId}:kilos`] = value.kilos.valueOriginal;
        }

        if (value.canastillas !== undefined) {
            if (out[`${area}:${descarteId}:canastillas`] === undefined) {
                out[`${area}:${descarteId}:canastillas`] = {};
            }
            out[`${area}:${descarteId}:canastillas`] = value.canastillas.valueOriginal;
        }
    }
    return out;
}