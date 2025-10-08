import { ComercialLogicError } from "../../Error/logicLayerError.js";
import { LotesRepository } from "../Class/Lotes.js";

export class ComercialService {
    static async crear_contenedor(data) {
        return {
            numeroContenedor: Number(data.numeroContenedor),
            infoContenedor: {
                clienteInfo: data.cliente,
                tipoFruta: data.tipoFruta,
                fechaCreacion: new Date(),
                fechaEstimadaCargue: new Date(data.fechaEstimadaCargue),
                fechaFinalizado: '',
                fechaSalida: '',
                fechaInicio: new Date(data.fechaInicioProceso),
                observaciones: data.observaciones,
                cerrado: false,
                tipoCaja: data.tipoCaja,
                calidad: data.calidad,
                calibres: data.calibres,
                sombra: data.sombra,
                defecto: data.defecto,
                mancha: data.mancha,
                verdeManzana: data.verdeManzana,
                cajasTotal: Number(data.cajasTotal),
                rtoEstimado: data.rtoEstimado,
                ultimaModificacion: new Date(),
            },
            pallets: 0,
        }
    }
    static async get_lotes_de_contenedores(contenedores) {
        try {
            const lotesIds = new Set();
            const outObj = {};

            const multCache = new Map();

            const getMult = (tipoCaja) => {
                if (multCache.has(tipoCaja)) return multCache.get(tipoCaja);

                const s = tipoCaja == null ? "" : String(tipoCaja);
                const i = s.lastIndexOf("-");
                const m = i >= 0 ? Number(s.slice(i + 1)) : NaN;
                const val = Number.isFinite(m) && m > 0 ? m : 1;
                multCache.set(tipoCaja, val);
                return val;
            }


            for (const contenedor of contenedores) {
                if (!outObj[contenedor.numeroContenedor]) {
                    outObj[contenedor.numeroContenedor] = {};
                }

                for (const pallet of contenedor.pallets) {

                    const items = Array.isArray(pallet?.EF1) ? pallet.EF1 : [];
                    for (const item of items) {

                        const { lote, calidad, cajas, tipoCaja } = item
                        const { enf } = lote

                        const mult = getMult(tipoCaja);
                        if (!outObj[contenedor.numeroContenedor][enf]) {
                            outObj[contenedor.numeroContenedor][enf] = {};
                        }
                        if (!outObj[contenedor.numeroContenedor][enf][calidad]) {
                            outObj[contenedor.numeroContenedor][enf][calidad] = 0
                        }
                        lotesIds.add(item.lote);
                        outObj[contenedor.numeroContenedor][enf][calidad] += cajas * mult;

                    }
                }
            }
            const query = {
                _id: { $in: [...lotesIds] }
            };

            const lotes = await LotesRepository.getLotes({ query: query, limit: 'all', select: { precio: 1, enf: 1 }, populate: { path: 'precio', select: 'exportacion' } });
            return { lotes, dataPallets: outObj };
        } catch (err) {
            if (err.status === 522) {
                throw err;
            }
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`);
        }
    }
    static async poner_precio_lotes(lotes, dataPallets) {
        let total = {}
        const conts = Object.keys(dataPallets);
        for (let ci = 0; ci < conts.length; ci++) {
            const cont = dataPallets[conts[ci]];
            const enfs = Object.keys(cont);
            for (let ei = 0; ei < enfs.length; ei++) {
                const enf = cont[enfs[ei]];
                const calidades = Object.keys(enf);

                const lote = lotes.find(l => l.enf === enfs[ei]);
                if (!lote || !lote.precio || !lote.precio.exportacion) continue;

                for (let ci = 0; ci < calidades.length; ci++) {
                    const calidad = enf[calidades[ci]];
                    const precio = lote.precio?.exportacion.get(calidades[ci]) || 0;
                    const totalPrecio = (calidad || 0) * precio;

                    if (!total[calidades[ci]]) {
                        total[calidades[ci]] = 0;
                    }
                    enf[calidades[ci]] = totalPrecio;
                    total[calidades[ci]] += totalPrecio;
                }
            }
        }

        return { preciosContenedores: dataPallets, totalPrecioCalidades: total };
    }
    static async poner_precio_contenedores(lotes, dataPallets) {
        let total = {}
        const totalContenedores = {}
        const conts = Object.keys(dataPallets);

        for (let coi = 0; coi < conts.length; coi++) {
            const cont = dataPallets[conts[coi]];
            const enfs = Object.keys(cont);
            if(!totalContenedores[conts[coi]]) totalContenedores[conts[coi]] = {};

            for (let ei = 0; ei < enfs.length; ei++) {
                const enf = cont[enfs[ei]];
                const calidades = Object.keys(enf);

                const lote = lotes.find(l => l.enf === enfs[ei]);
                if (!lote || !lote.precio || !lote.precio.exportacion) continue;

                for (let ci = 0; ci < calidades.length; ci++) {
                    const calidad = enf[calidades[ci]];
                    const precio = lote.precio?.exportacion.get(calidades[ci]) || 0;
                    const totalPrecio = (calidad || 0) * precio;

                    if (!total[calidades[ci]]) {
                        total[calidades[ci]] = 0;
                    }
                    if (!totalContenedores[conts[coi]][calidades[ci]]) {
                        totalContenedores[conts[coi]][calidades[ci]] = 0;
                    }
                    totalContenedores[conts[coi]][calidades[ci]] += totalPrecio;
                    total[calidades[ci]] += totalPrecio;
                }
            }
        }

        return { preciosContenedores: totalContenedores, totalPrecioCalidades: total };
    }
}