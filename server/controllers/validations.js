
function have_lote_GGN_export(predio, contenedor) {

    if (!("GGN" in predio)) return false;
    if (predio.GGN === undefined || predio.GGN === '') return false;
    if (!("paises" in predio.GGN)) return false;
    if (predio.GGN.paises.lenght < 1) return false

    if (!("clienteInfo" in contenedor.infoContenedor)) return false;
    if (!("PAIS_DESTINO" in contenedor.infoContenedor.clienteInfo)) return false;
    if (!predio.GGN.paises.some(
        element => contenedor.infoContenedor.clienteInfo.PAIS_DESTINO.includes(element)
    )) return false;

    return true;
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