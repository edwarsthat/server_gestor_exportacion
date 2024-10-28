
function have_lote_GGN_export(predio, contenedor) {

    if (!("GGN" in predio)) return false;
    if (!("clienteInfo" in contenedor.infoContenedor)) return false;
    if (predio.GGN === undefined) return false;
    if (!("paises" in predio.GGN)) return false;
    if (!("PAIS_DESTINO" in contenedor.infoContenedor.clienteInfo)) return false;
    if (!predio.GGN.paises.some(element => contenedor.infoContenedor.clienteInfo.PAIS_DESTINO.includes(element))) return false;

    return true;
}

module.exports = {
    have_lote_GGN_export
}