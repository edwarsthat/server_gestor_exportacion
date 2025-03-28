
function have_lote_GGN_export(predio, contenedor, item) {
    try {

        // se verifica que tenga GGN 
        if (predio.GGN === undefined || predio.GGN === '' || predio.GGN === 'undefined') return false;
        if (predio.GGN.paises.length < 1) return false
        if (predio.GGN.tipo_fruta.length < 1) return false

        //Verificar los datos del contenedor
        if (!predio.GGN.paises.some(
            element => contenedor.infoContenedor.clienteInfo.PAIS_DESTINO.includes(element)
        )) return false;
        //se verifica si el tipo de fruta del lote es del mismo que el del ggn
        //toca revisar si si 
        if (!predio.GGN.tipo_fruta.includes(item.tipoFruta)) return false;


        return true;
    } catch (err) {
        console.log("validacion es GGN ", err)
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