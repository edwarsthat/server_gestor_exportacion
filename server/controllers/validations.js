
function have_lote_GGN_export(lote, contenedor, item="") {
    try {

        // Desestructurar para acceso más limpio y validación rápida
        if( !lote.GGN ) return false;
        const { GGN } = lote.predio;
        const { PAIS_DESTINO } = contenedor.infoContenedor.clienteInfo || {};

        // Validar que exista GGN y tenga datos
        if (!GGN.paises.length) {
            return false;
        }

        return PAIS_DESTINO &&
            GGN.paises.some(pais => PAIS_DESTINO.includes(pais))

    } catch (err) {
        console.error("Error en validación GGN:", { error: err.message, predio: lote.predio?.GGN, tipoFruta: item?.tipoFruta });
        return false;
    }
}

async function is_finish_lote(lote) {

    if (lote.calidad) {
        if (!lote.calidad.calidadInterna) return false
        if (!lote.calidad.clasificacionCalidad) return false
        if (!lote.calidad.fotosCalidad) return false
        if (lote.deshidratacion <= -1 && lote.deshidratacion >= 2.5) return false

        return true
    }
    return false
}

export {
    have_lote_GGN_export,
    is_finish_lote
}