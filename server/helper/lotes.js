import { LotesRepository } from "../Class/Lotes.js";

export class LotesHelper {
    static async actualizar_lotes_helper(_id, update, options = {}) {
        const [r1, r2] = await Promise.allSettled([
            LotesRepository.actualizar_lote({ _id }, update, {...options, softNotFound: true, calculateFields: true}),
            LotesRepository.actualizar_lote_Maquila({ _id }, update, {...options, softNotFound: true, calculateFields: true})
        ]);
        const ef1 = r1.status === 'fulfilled' ? r1.value : null;
        const ef10 = r2.status === 'fulfilled' ? r2.value : null;

        const lote = ef1 || ef10;
        if (lote) return lote;

        if (ef1 && ef10) {
            throw new Error('Conflicto: el _id existe en ambas colecciones');
        }
        throw new Error('No se encontró el lote en ninguna colección');
    }
    static async obtener_lote_helper(filter = {}, options = {}) {
        const [r1, r2] = await Promise.allSettled([
            LotesRepository.getLotes2(filter, options),
            LotesRepository.getLotesMaquila(filter, options)
        ]);

        const ef1 = r1.status === 'fulfilled' ? r1.value : null;
        const ef10 = r2.status === 'fulfilled' ? r2.value : null;

        const lote = ef1 || ef10;
        if (lote) return lote;

        if (ef1 && ef10) {
            throw new Error('Conflicto: el lote existe en ambas colecciones');
        }
        throw new Error('No se encontró el lote en ninguna colección');
    }
}