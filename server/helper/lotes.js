import { LotesRepository } from "../Class/Lotes.js";

export class LotesHelper {
    static async actualizar_lotes_helper(filter, update, options = {}) {
        if (!filter) throw new Error('No se proporcionó un filtro');
        if (!update || Object.keys(update).length === 0) {
            throw new Error('El parámetro update es requerido y no puede estar vacío');
        }

        // 1. PRIMERO VALIDAR: ¿Dónde está el lote?
        // Reutiliza tu obtener_lote_helper que ya tiene toda la lógica de seguridad
        const lotesEncontrados = await this.obtener_lote_helper({ query: filter }, options);

        if (lotesEncontrados.length === 0) {
            throw new Error(`No se encontró el lote en ninguna colección`);
        }

        // 2. DECIDIR REPOSITORIO:
        // Como obtener_lote_helper ya valida que no haya duplicados,
        // podemos confiar en el resultado.
        const loteOriginal = lotesEncontrados[0];
        const esMaquila = !!loteOriginal.enf?.toUpperCase().startsWith('EF10-');

        // 3. ACTUALIZAR SOLO EL QUE CORRESPONDE
        const repoCall = esMaquila
            ? LotesRepository.actualizar_lote_Maquila(filter, update, { ...options, calculateFields: true })
            : LotesRepository.actualizar_lote(filter, update, { ...options, calculateFields: true });

        try {
            const loteActualizado = await repoCall;
            if (!loteActualizado) {
                throw new Error('El lote desapareció durante la operación');
            }
            return loteActualizado;
        } catch (err) {
            throw new Error(`Fallo en la escritura del lote: ${err.message}`);
        }
    }
    static async obtener_lote_helper(filter = {}, options = {}) {
        const [r1, r2] = await Promise.allSettled([
            LotesRepository.getLotes(filter, options),
            LotesRepository.getLotesMaquila(filter, options)
        ]);

        if (r1.status === 'rejected' && r2.status === 'rejected') {
            throw new Error(`Error obteniendo lotes, ambas bases de datos estan caidas`);
        }

        // Filtrar nulls/undefined para evitar datos corruptos de BD
        const ef1Raw = r1.status === 'fulfilled' && Array.isArray(r1.value) ? r1.value.filter(Boolean) : [];
        const ef10Raw = r2.status === 'fulfilled' && Array.isArray(r2.value) ? r2.value.filter(Boolean) : [];

        // Detectar datos corruptos sin romper el flujo
        if (r1.status === 'fulfilled' && Array.isArray(r1.value) && ef1Raw.length !== r1.value.length) {
            console.warn(`[LotesHelper] Datos corruptos en EF1: ${r1.value.length - ef1Raw.length} elementos nulos filtrados. Filter: ${JSON.stringify(filter)}`);
        }
        if (r2.status === 'fulfilled' && Array.isArray(r2.value) && ef10Raw.length !== r2.value.length) {
            console.warn(`[LotesHelper] Datos corruptos en EF10: ${r2.value.length - ef10Raw.length} elementos nulos filtrados. Filter: ${JSON.stringify(filter)}`);
        }

        const ef1 = ef1Raw.length > 0 ? ef1Raw : null;
        const ef10 = ef10Raw.length > 0 ? ef10Raw : null;

        if (ef1 && ef10) {
            throw new Error('Conflicto de integridad: El lote se encuentra duplicado en EF1 y EF10');
        }

        return ef1 || ef10 || [];
    }
}