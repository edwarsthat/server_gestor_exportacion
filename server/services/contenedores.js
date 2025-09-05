import { parseMultTipoCaja } from "./helpers/contenedores.js";

export class ContenedoresService {
    static obtenerResumen = (cont) => {
        if (!Array.isArray(cont) || cont.length === 0) return {};

        const resumen = Object.create(null);
        const TotalCalidades = new Set()
        const TotalCalibres = new Set()

        for (const { pallets = [] } of cont) {
            for (const pallet of pallets) {

                const EF1 = Array.isArray(pallet?.EF1) ? pallet.EF1 : [];
                const calibreSet = new Set()
                const calidadSet = new Set()
                const tipoFrutaSet = new Set()
                const fechaSet = new Set()

                for (const item of EF1) {
                    const { tipoFruta, calibre, calidad, tipoCaja, cajas = 0, fecha: rawFecha } = item ?? {};

                    const fecha = rawFecha
                        ? new Date(rawFecha).toISOString().slice(0, 10)
                        : null;
                    const mult = parseMultTipoCaja(tipoCaja);
                    if (mult <= 0) continue; // sin peso, no aporta
                    const kilos = cajas * mult;

                    //se crea el elemento en el objeto
                    if (!resumen[tipoFruta]) {
                        resumen[tipoFruta] = {
                            totalCajas: 0,
                            totalKilos: 0
                        }
                    }
                    if (!resumen[tipoFruta][fecha]) {
                        resumen[tipoFruta][fecha] = {
                            calibre: {},
                            calidad: {},
                        }
                    }


                    if (!resumen[tipoFruta][fecha].calibre[calibre]) {
                        resumen[tipoFruta][fecha].calibre[calibre] = {
                            cajas: 0,
                            cajasP: 0,
                            kilos: 0,
                            kilosP: 0,
                            pallet: 0,
                            calidad: {}
                        }
                    }
                    if (!resumen[tipoFruta][fecha].calidad[calidad]) {
                        resumen[tipoFruta][fecha].calidad[calidad] = {
                            cajas: 0,
                            cajasP: 0,
                            kilos: 0,
                            kilosP: 0,
                            pallet: 0
                        }
                    }
                    if (!resumen[tipoFruta][fecha].calibre[calibre].calidad[calidad]) {
                        resumen[tipoFruta][fecha].calibre[calibre].calidad[calidad] = {
                            cajas: 0,
                            kilos: 0,
                            kilosP: 0,
                            pallet: 0
                        }
                    }

                    //si si hay peso
                    if (kilos) {

                        //lo kilos total
                        //if si mira si solo se requieren los datos de hoy
                        resumen[tipoFruta][fecha].calibre[calibre].kilos += kilos
                        resumen[tipoFruta][fecha].calibre[calibre].cajas += cajas

                        resumen[tipoFruta][fecha].calibre[calibre].calidad[calidad].kilos += kilos
                        resumen[tipoFruta][fecha].calibre[calibre].calidad[calidad].cajas += cajas

                        resumen[tipoFruta][fecha].calidad[calidad].kilos += kilos
                        resumen[tipoFruta][fecha].calidad[calidad].cajas += cajas

                        resumen[tipoFruta].totalCajas += cajas
                        resumen[tipoFruta].totalKilos += kilos

                    }
                    calibreSet.add(calibre)
                    calidadSet.add(calidad)
                    tipoFrutaSet.add(tipoFruta)
                    fechaSet.add(fecha)

                    TotalCalidades.add(calidad)
                    TotalCalibres.add(calibre)
                }


                const arrTipoFruta = [...tipoFrutaSet]
                const arrFecha = [...fechaSet]

                arrTipoFruta.forEach(fruta => {

                    arrFecha.forEach(fecha => {
                        const arrCalibre = [...calibreSet]
                        arrCalibre.forEach(cal => {
                            if (resumen[fruta][fecha].calibre[cal]) {
                                resumen[fruta][fecha].calibre[cal].pallet += 1
                            }
                        })
                        const arrCalidad = [...calidadSet]
                        arrCalidad.forEach(cal => {
                            if (resumen[fruta][fecha].calidad[cal]) {
                                resumen[fruta][fecha].calidad[cal].pallet += 1
                            }
                        })
                    })
                })
            }
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
                        if(tipo === 'calibre'){
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

}