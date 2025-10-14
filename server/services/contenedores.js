
export class ContenedoresService {
    static obtenerResumen = (itemPallets) => {
        if (!Array.isArray(itemPallets) || itemPallets.length === 0) return {};

        const resumen = Object.create(null);
        const TotalCalidades = new Set()
        const TotalCalibres = new Set()

        for (const item of itemPallets) {
            const calibreSet = new Set()
            const calidadSet = new Set()
            const tipoFrutaSet = new Set()
            const fechaSet = new Set()

            const { tipoFruta, calibre, calidad, cajas = 0, fecha: rawFecha, kilos = 0 } = item ?? {};
            const fecha = rawFecha
                ? new Date(rawFecha).toISOString().slice(0, 10)
                : null;

            //se crea el elemento en el objeto
            if (!resumen[tipoFruta._id]) {
                resumen[tipoFruta._id] = {
                    totalCajas: 0,
                    totalKilos: 0
                }
            }
            if (!resumen[tipoFruta._id][fecha]) {
                resumen[tipoFruta._id][fecha] = {
                    calibre: {},
                    calidad: {},
                }
            }


            if (!resumen[tipoFruta._id][fecha].calibre[calibre]) {
                resumen[tipoFruta._id][fecha].calibre[calibre] = {
                    cajas: 0,
                    cajasP: 0,
                    kilos: 0,
                    kilosP: 0,
                    pallet: 0,
                    calidad: {}
                }
            }
            if (!resumen[tipoFruta._id][fecha].calidad[calidad._id]) {
                resumen[tipoFruta._id][fecha].calidad[calidad._id] = {
                    cajas: 0,
                    cajasP: 0,
                    kilos: 0,
                    kilosP: 0,
                    pallet: 0
                }
            }
            if (!resumen[tipoFruta._id][fecha].calibre[calibre].calidad[calidad._id]) {
                resumen[tipoFruta._id][fecha].calibre[calibre].calidad[calidad._id] = {
                    cajas: 0,
                    kilos: 0,
                    kilosP: 0,
                    pallet: 0
                }
            }

            resumen[tipoFruta._id][fecha].calibre[calibre].kilos += kilos
            resumen[tipoFruta._id][fecha].calibre[calibre].cajas += cajas

            resumen[tipoFruta._id][fecha].calibre[calibre].calidad[calidad._id].kilos += kilos
            resumen[tipoFruta._id][fecha].calibre[calibre].calidad[calidad._id].cajas += cajas

            resumen[tipoFruta._id][fecha].calidad[calidad._id].kilos += kilos
            resumen[tipoFruta._id][fecha].calidad[calidad._id].cajas += cajas

            resumen[tipoFruta._id].totalCajas += cajas
            resumen[tipoFruta._id].totalKilos += kilos


            calibreSet.add(calibre)
            calidadSet.add(calidad._id)
            tipoFrutaSet.add(tipoFruta._id)
            fechaSet.add(fecha)

            TotalCalidades.add(calidad._id)
            TotalCalibres.add(calibre)



            const arrTipoFruta = [...tipoFrutaSet]
            const arrFecha = [...fechaSet]

            arrTipoFruta.forEach(fruta => {

                arrFecha.forEach(fecha => {
                    const arrCalibre = [...calibreSet]
                    arrCalibre.forEach(cal => {
                        if (resumen?.[fruta]?.[fecha]?.calibre?.[cal]) {
                            resumen[fruta][fecha].calibre[cal].pallet += 1
                        }
                    })
                    const arrCalidad = [...calidadSet]
                    arrCalidad.forEach(cal => {
                        if (resumen?.[fruta]?.[fecha]?.calidad?.[cal]) {
                            resumen[fruta][fecha].calidad[cal].pallet += 1
                        }
                    })
                })
            })

        }

        Object.keys(resumen).forEach(tipoFruta => {
            const itemFruta = resumen[tipoFruta]
            const kilosTotal = itemFruta.totalKilos
            const cajasTotal = itemFruta.totalCajas
            for (const fecha in itemFruta) {
                if (fecha === 'totalKilos' || fecha === 'totalCajas') continue;
                Object.keys(itemFruta[fecha]).forEach(tipo => {
                    const ca = itemFruta[fecha][tipo]
                    Object.keys(ca).forEach(key => {
                        const item = ca[key]
                        item.cajasP = (item.cajas * 100) / cajasTotal
                        item.kilosP = (item.kilos * 100) / kilosTotal
                        if (tipo === 'calibre') {
                            Object.keys(item.calidad).forEach(key2 => {
                                const item2 = item.calidad[key2]
                                item2.cajasP = ((item2.cajas * 100) / cajasTotal)
                                item2.kilosP = ((item2.kilos * 100) / kilosTotal)
                            })
                        }
                    })
                })
            }
        })

        // console.log(resumen)
        return { resumen, totalCalidades: [...TotalCalidades], totalCalibres: [...TotalCalibres] };
    }
    static obtenerResumenPredios = (itemPallets) => {
        const predios = {}
        for (const item of itemPallets) {

            if (!predios[item.lote._id]) {
                predios[item.lote._id] = {
                    enf: item.lote.enf,
                    predio: item.lote.predio,
                    tipoFruta: item.tipoFruta._id
                }
                predios[item.lote._id].cont = {}
                predios[item.lote._id].calibres = {}

            }
            if (!predios[item.lote._id].cont[item.contenedor._id]) {
                predios[item.lote._id].cont[item.contenedor._id] = {
                    numero: item.contenedor.numeroContenedor,
                    kilos: 0,
                    cajas: 0
                }
            }
            if (!predios[item.lote._id].calibres[item.calibre]) {
                predios[item.lote._id].calibres[item.calibre] = {
                    kilos: 0,
                    cajas: 0
                }
            }
            if (item.tipoCaja !== null) {
                predios[item.lote._id].cont[item.contenedor._id].cajas += item.cajas
                predios[item.lote._id].calibres[item.calibre].cajas += item.cajas

                const kilos = item.kilos
                predios[item.lote._id].cont[item.contenedor._id].kilos += kilos
                predios[item.lote._id].calibres[item.calibre].kilos += kilos
            }

        }
        return predios
    }
}