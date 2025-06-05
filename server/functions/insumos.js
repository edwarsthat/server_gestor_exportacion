import { ProcessError } from "../../Error/ProcessError.js";


async function insumos_contenedor(contenedor) {
    try {
        if (!contenedor)
            throw new Error("Contenedor no definido, generar lista insumos, cerrar contenedor");

        const listaPedirInsumos = {};

        contenedor.pallets.forEach((pallet, index) => {
            let tipoCajaPallet = ''
            let tipoFrutaPallet = ''
            pallet.EF1.forEach(item => {
                const { cajas, tipoCaja, tipoFruta, lote } = item
                const frutaCodigo = tipoFruta === 'Limon' ? 'LE' : 'NE';

                const [nombreCaja, kilosN] = tipoCaja.split("-");
                const kilos = kilosN.replace(",", ".");
                const kilosTotal = Number(kilos) * cajas;
                tipoCajaPallet = nombreCaja
                tipoFrutaPallet = tipoFruta

                if (!Object.prototype.hasOwnProperty.call(listaPedirInsumos, frutaCodigo)) {
                    if (lote === "65c27f3870dd4b7f03ed9857") {
                        const frutaCodigoNacional = tipoFruta === 'Limon' ? 'LN' : 'NN';
                        listaPedirInsumos[frutaCodigoNacional] = 0
                    } else {
                        listaPedirInsumos[frutaCodigo] = 0
                    }
                }

                if (!Object.prototype.hasOwnProperty.call(listaPedirInsumos, nombreCaja)) {
                    listaPedirInsumos[nombreCaja] = 0
                }

                if (lote === "65c27f3870dd4b7f03ed9857") {
                    const frutaCodigoNacional = tipoFruta === 'Limon' ? 'LN' : 'NN';
                    listaPedirInsumos[frutaCodigoNacional] += kilosTotal
                } else {
                    listaPedirInsumos[frutaCodigo] += kilosTotal
                }

                listaPedirInsumos[nombreCaja] += cajas

                //se ingresan las grapas de acuerdo al tipo de caja
                if (nombreCaja !== 'Bulto') {
                    if (nombreCaja !== 'K') {
                        if (!Object.prototype.hasOwnProperty.call(listaPedirInsumos, "I03")) {
                            listaPedirInsumos["I03"] = 0
                        }
                        listaPedirInsumos["I03"] += 8 * cajas
                    }
                }

            })

            //se ingresa el tipo de esquinero de acuerdo al tipo de caja
            if (tipoCajaPallet === 'B') {
                if (!Object.prototype.hasOwnProperty.call(listaPedirInsumos, "E31")) {
                    listaPedirInsumos["E31"] = 0
                }
                if (!Object.prototype.hasOwnProperty.call(listaPedirInsumos, "E32")) {
                    listaPedirInsumos["E32"] = 0
                }
                listaPedirInsumos["E31"] += 4
                listaPedirInsumos["E32"] += 2

            } else if (tipoCajaPallet === 'G' || tipoCajaPallet === 'K') {
                if (!Object.prototype.hasOwnProperty.call(listaPedirInsumos, "E30")) {
                    listaPedirInsumos["E30"] = 0
                }
                if (!Object.prototype.hasOwnProperty.call(listaPedirInsumos, "E35")) {
                    listaPedirInsumos["E35"] = 0
                }
                listaPedirInsumos["E30"] += 4
                listaPedirInsumos["E35"] += 4
            }


            //se ingresa las grapas de los zunchos de acuerdo al tipo de fruta y la caja en el caso del limon
            if (tipoCajaPallet !== 'Bulto') {
                if (!Object.prototype.hasOwnProperty.call(listaPedirInsumos, "I02")) {
                    listaPedirInsumos["I02"] = 0
                }
                if (tipoFrutaPallet === 'Limon') {
                    if (tipoCajaPallet === 'K') {
                        listaPedirInsumos["I02"] += 26
                    } else {
                        listaPedirInsumos["I02"] += 12
                    }

                } else if (tipoFrutaPallet === 'Naranja') {
                    listaPedirInsumos["I02"] += 13
                }
            }


            //se ingresa el zuncho por pallet
            if (tipoCajaPallet !== 'Bulto') {
                if (!Object.prototype.hasOwnProperty.call(listaPedirInsumos, "I04")) {
                    listaPedirInsumos["I04"] = 0
                }
                //se pregunta que tipo de fruta es
                if (tipoFrutaPallet === 'Limon') {
                    if (index <= 19) {
                        listaPedirInsumos["I04"] += 62
                    } else if (index === 20) {
                        listaPedirInsumos["I04"] += 58
                    }
                } else if (tipoFrutaPallet === 'Naranja') {
                    listaPedirInsumos["I04"] += 69
                }
            }
        });

        //se seleccionan las estibas de acuerdo a la cantidad de pallets
        if (contenedor.pallets.length === 21) {
            listaPedirInsumos["E19"] = 20
            listaPedirInsumos["E20"] = 1
        } else if (contenedor.pallets.length === 20) {
            listaPedirInsumos["E20"] = 20
        }

        //se agrega insumos sobres de Etileno
        if (contenedor.infoContenedor.tipoFruta === 'Limon') {
            listaPedirInsumos["I01"] = 10
            listaPedirInsumos["I11"] = 208
        }

        listaPedirInsumos["I18"] = 1
        listaPedirInsumos["I23"] = 100

        return listaPedirInsumos
    } catch (err) {
        throw new ProcessError(423, `Error ${err.name}: ${err.message}`)
    }
}

export {
    insumos_contenedor
}