
export function parseMultTipoCaja(tipoCaja) {
    if (!tipoCaja) return 0;
    const i = tipoCaja.lastIndexOf('-');
    if (i < 0) return 0;
    const n = Number(tipoCaja.slice(i + 1).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
}