import { toObjId } from "./general.js";

export function parseMultTipoCaja(tipoCaja) {
    if (!tipoCaja) return 0;
    const i = tipoCaja.lastIndexOf('-');
    if (i < 0) return 0;
    const n = Number(tipoCaja.slice(i + 1).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export const normalizeEF1Item = (it) => ({
    ...it,
    lote: toObjId(it.lote, 'lote'),
    calidad: it.calidad ? toObjId(it.calidad, 'calidad') : undefined,
    tipoFruta: it.tipoFruta ? toObjId(it.tipoFruta, 'tipoFruta') : undefined,
    cajas: Number(it.cajas) || 0,
    fecha: it.fecha ? new Date(it.fecha) : new Date(),
    SISPAP: !!it.SISPAP,
    GGN: !!it.GGN,
});