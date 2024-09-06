const { ProcessError } = require("../../Error/ProcessError");

async function insumos_contenedor(contenedor) {
    try {
        if (!contenedor)
            throw new Error("Contenedor no definido, generar lista insumos, cerrar contenedor");

        const listaPedirInsumos = {};

        contenedor.pallets.forEach(pallet => {
            pallet.EF1.forEach(item => {
                const { cajas, tipoCaja, tipoFruta, lote } = item

                const [nombreCaja, kilos] = tipoCaja.split("-");
                const kilosTotal = Number(kilos) * cajas;


                if (!Object.prototype.hasOwnProperty.call(listaPedirInsumos, tipoFruta)) {
                    if (lote === "65c27f3870dd4b7f03ed9857") {
                        listaPedirInsumos[`${tipoFruta}_nacional`] = 0
                    } else {
                        listaPedirInsumos[tipoFruta] = 0
                    }
                }

                if (!Object.prototype.hasOwnProperty.call(listaPedirInsumos, nombreCaja)) {
                    listaPedirInsumos[nombreCaja] = 0
                }


                listaPedirInsumos[tipoFruta] += kilosTotal
                listaPedirInsumos[nombreCaja] += cajas
            })
        });

        if (contenedor.pallets.length === 21) {
            listaPedirInsumos["estiba120"] = 20
            listaPedirInsumos["estiba100"] = 1
        } else if (contenedor.pallets.length === 20) {
            listaPedirInsumos["estiba120"] = 20
        }

        return listaPedirInsumos
    } catch (err) {
        throw new ProcessError(423, `Error ${err.name}: ${err.message}`)
    }
}



module.exports = {
    insumos_contenedor
}