
function have_lote_GGN_export(predio, contenedor, item) {
    try {
        // Desestructurar para acceso más limpio y validación rápida
        const { GGN } = predio;
        const { PAIS_DESTINO } = contenedor?.infoContenedor?.clienteInfo || {};
        const { tipoFruta } = item;

        // Validar que exista GGN y tenga datos
        if (!GGN?.paises?.length || !GGN?.tipo_fruta?.length) {
            return false;
        }

        // Validar país de destino y tipo de fruta en una sola línea
        return PAIS_DESTINO &&
            GGN.paises.some(pais => PAIS_DESTINO.includes(pais)) &&
            GGN.tipo_fruta.includes(tipoFruta);

    } catch (err) {
        console.log("Error en validación GGN:", { error: err.message, predio: predio?.GGN, tipoFruta: item?.tipoFruta });
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

module.exports = {
    have_lote_GGN_export,
    is_finish_lote
}