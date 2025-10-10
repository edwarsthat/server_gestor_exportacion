import { toObjId } from "./general.js";
const PAISES_DEL_CARIBE = ["Republica dominicana", "Puerto rico", "ISLAS DEL CARIBE", "GUADALUPE", "MARTINICA", "ISLAS FRANCESAS"]

export function parseMultTipoCaja(tipoCaja) {
    if (!tipoCaja) return 0;
    const i = tipoCaja.lastIndexOf('-');
    if (i < 0) return 0;
    const n = Number(tipoCaja.slice(i + 1).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export const normalizeEF1Item = (it) => ({
    ...it,
    pallet: toObjId(it.pallet, 'pallet'),
    contenedor: toObjId(it.contenedor, 'contenedor'),
    lote: toObjId(it.lote, 'lote'),
    calidad: it.calidad ? toObjId(it.calidad, 'calidad') : undefined,
    tipoFruta: it.tipoFruta ? toObjId(it.tipoFruta, 'tipoFruta') : undefined,
    cajas: Number(it.cajas) || 0,
    fecha: it.fecha ? new Date(it.fecha) : new Date(),
    SISPAP: !!it.SISPAP,
    GGN: !!it.GGN,
    user: it.user || 'system',
    kilo: it.kilos ? Number(it.kilos) : 0,
});

export function isPaisesCaribe(contenedor) {
    if (contenedor.infoContenedor && contenedor.infoContenedor.clienteInfo) {
        for (const pais of contenedor.infoContenedor.clienteInfo.PAIS_DESTINO) {
            if (PAISES_DEL_CARIBE.includes(pais)) {
                return false;
            }
        }
    }
    return true;
}

export function resumenCalidad(itemsPallet, calidad = "") {
    const out = {}
    let total = 0;
    let totalPallets = 0;

    for (const item of itemsPallet) {
        const calibre = new Set()

        if (item.pallet.numeroPallet > totalPallets) totalPallets = item.pallet.numeroPallet
        total += item.cajas
        if (item.calidad._id === calidad || calidad === "") {
            if (!out[item.calibre]) {
                out[item.calibre] = {
                    cantidad: 0,
                }
            }
            out[item.calibre].cantidad += item.cajas
            calibre.add(item.calibre)
        }
    }

    Object.keys(out).forEach(item => {
        out[item].pallets = Math.round((out[item].cantidad * totalPallets) / total)
        out[item].porcentage = (out[item].cantidad * 100) / total
    })
    return out
}