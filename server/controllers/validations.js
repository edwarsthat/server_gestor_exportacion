
function have_lote_GGN_export(predio, contenedor, item) {
    try {
        if (!("GGN" in predio)) return false;
        if (predio.GGN === undefined || predio.GGN === '') return false;
        if (!("paises" in predio.GGN)) return false;

        //se verifica si el GGN tiene tipo de fruta
        if (!("tipo_fruta" in predio.GGN)) return false;

        if (predio.GGN.paises.length < 1) return false

        if (predio.GGN.tipo_fruta.length === undefined) return false

        if (predio.GGN.tipo_fruta.length < 1) return false

        //Verificar los datos del contenedor
        if (!("clienteInfo" in contenedor.infoContenedor)) return false;

        if (!("PAIS_DESTINO" in contenedor.infoContenedor.clienteInfo)) return false;
        if (!predio.GGN.paises.some(
            element => contenedor.infoContenedor.clienteInfo.PAIS_DESTINO.includes(element)
        )) return false;
        //se verifica si el tipo de fruta del lote es del mismo que el del ggn
        //toca revisar si si 
        if (!predio.GGN.tipo_fruta.includes(item.tipoFruta)) return false;


        return true;
    } catch (err) {
        return false
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