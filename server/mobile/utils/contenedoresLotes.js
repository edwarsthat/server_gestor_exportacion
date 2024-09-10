const { LotesRepository } = require("../../Class/Lotes");

const oobtener_datos_lotes_to_listaEmpaque = async (contenedores) => {
    try {
        const ids = contenedores.map(contenedor => contenedor._id);
        const query = { contenedores: { $in: ids } }
        const lotes = await LotesRepository.getLotes({ query: query })
        for (let i = 0; i < contenedores.length; i++) {
            for (let j = 0; j < contenedores[i].pallets.length; j++) {
                for (let n = 0; n < contenedores[i].pallets[j].get("EF1").length; n++) {
                    const lote = lotes.find(item => item._id.toString() === contenedores[i].pallets[j].get("EF1")[n].lote);
                    contenedores[i].pallets[j].get("EF1")[n].lote = typeof lote === "object" ?
                        {
                            enf: lote._doc.enf,
                            predio: lote._doc.predio.PREDIO,
                            _id: lote._doc._id,
                            ICA: lote._doc.predio.ICA,
                            GGN: lote._doc.predio.GGN
                        }
                        :
                        contenedores[i].pallets[j].get("EF1")[n].lote;
                }
            }
            contenedores[i].pallets = contenedores[i].pallets.map(pallet => Object.fromEntries(pallet));
        }
        return contenedores;
    } catch (e) {
        console.error(e);
        return contenedores;
    }
};
const obtener_datos_lotes_listaEmpaque_cajasSinPallet = async (items) => {
    const ids = items.map(item => item.lote);
    const lotes = await LotesRepository.getLotes({ ids: ids })
    for (let i = 0; i < items.length; i++) {
        const lote = lotes.find(item => item._id.toString() === items[i].lote);
        items[i].lote = { enf: lote._doc.enf, predio: lote._doc.predio.PREDIO, _id: lote._doc._id }
    }
    return items
}
module.exports = {
    oobtener_datos_lotes_to_listaEmpaque,
    obtener_datos_lotes_listaEmpaque_cajasSinPallet
}