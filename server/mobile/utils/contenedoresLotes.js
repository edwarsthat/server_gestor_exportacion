import { LotesRepository } from "../../Class/Lotes.js";

const oobtener_datos_lotes_to_listaEmpaque = async (contenedores) => {
    try {
        const ids = contenedores.map(contenedor => contenedor._id);
        const query = { contenedores: { $in: ids } }
        const lotes = await LotesRepository.getLotes2({ query: query, limit: "all" })
        for (let i = 0; i < contenedores.length; i++) {
            for (let j = 0; j < contenedores[i].pallets.length; j++) {
                for (let n = 0; n < contenedores[i].pallets[j]["EF1"].length; n++) {

                    const lote = lotes.find(item => item._id.toString() === contenedores[i].pallets[j]["EF1"][n].lote.toString());
                    // console.log(lote)
                    if(!lote){
                        console.log(contenedores[i].pallets[j]["EF1"][n].lote.toString())
                    }
                    contenedores[i].pallets[j]["EF1"][n].lote = 
                        {
                            enf: lote.enf,
                            predio: lote.predio.PREDIO,
                            _id: lote._id,
                            ICA: lote.predio.ICA,
                            GGN: lote.predio.GGN,
                            predioID: lote.predio._id,
                            SISPAP: lote.predio.SISPAP,
                        }

                }
            }

        }
        return contenedores;
    } catch (e) {
        console.error(e);
        return contenedores;
    }
};
const obtener_datos_lotes_listaEmpaque_cajasSinPallet = async (items) => {
    const ids = items.map(item => item.lote);
    const lotes = await LotesRepository.getLotes2({ ids: ids })
    for (let i = 0; i < items.length; i++) {
        const lote = lotes.find(item => item._id.toString() === items[i].lote);
        items[i].lote = { enf: lote.enf, predio: lote.predio.PREDIO, _id: lote._id }
    }
    return items
}
export {
    oobtener_datos_lotes_to_listaEmpaque,
    obtener_datos_lotes_listaEmpaque_cajasSinPallet
}