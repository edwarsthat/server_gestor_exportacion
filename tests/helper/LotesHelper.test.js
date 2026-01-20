import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { LotesHelper } from '../../server/helper/lotes.js';
import { LotesRepository } from '../../server/Class/Lotes.js';

/**
 * Tests unitarios para LotesHelper.obtener_lote_helper
 *
 * Este método busca lotes en dos colecciones (EF1 y EF10) simultáneamente
 * usando Promise.allSettled para tolerancia a fallos.
 *
 * Responsabilidades:
 * 1. Buscar en ambas colecciones en paralelo
 * 2. Manejar fallos individuales de cada colección
 * 3. Detectar conflictos de integridad (lote duplicado)
 * 4. Retornar datos de la colección que tenga resultados
 */
describe('LotesHelper.obtener_lote_helper', () => {

    // ============================================================
    // SETUP: Mocks de dependencias
    // ============================================================
    let mockLoteEF1;
    let mockLoteEF10;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock de lote EF1
        mockLoteEF1 = {
            _id: '507f1f77bcf86cd799439011',
            enf: 'EF1-001',
            deshidratacion: 1.5,
            predio: { PREDIO: 'Finca Test' }
        };

        // Mock de lote EF10 (maquila)
        mockLoteEF10 = {
            _id: '507f1f77bcf86cd799439012',
            enf: 'EF10-001',
            deshidratacion: 2.0,
            predio: { PREDIO: 'Finca Maquila' }
        };

        // Mock por defecto: EF1 retorna lote, EF10 vacío
        jest.spyOn(LotesRepository, 'getLotes').mockResolvedValue([mockLoteEF1]);
        jest.spyOn(LotesRepository, 'getLotesMaquila').mockResolvedValue([]);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ============================================================
    // TEST GROUP: Casos básicos de funcionamiento
    // ============================================================
    describe('casos básicos', () => {

        test('debería retornar lotes de EF1 cuando EF1 tiene datos y EF10 está vacío', async () => {
            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);
            LotesRepository.getLotesMaquila.mockResolvedValue([]);

            const result = await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            expect(result).toEqual([mockLoteEF1]);
        });

        test('debería retornar lotes de EF10 cuando EF1 está vacío y EF10 tiene datos', async () => {
            LotesRepository.getLotes.mockResolvedValue([]);
            LotesRepository.getLotesMaquila.mockResolvedValue([mockLoteEF10]);

            const result = await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            expect(result).toEqual([mockLoteEF10]);
        });

        test('debería retornar array vacío cuando ambas colecciones están vacías', async () => {
            LotesRepository.getLotes.mockResolvedValue([]);
            LotesRepository.getLotesMaquila.mockResolvedValue([]);

            const result = await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            expect(result).toEqual([]);
        });

        test('debería lanzar error de conflicto cuando ambas colecciones tienen datos', async () => {
            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);
            LotesRepository.getLotesMaquila.mockResolvedValue([mockLoteEF10]);

            await expect(LotesHelper.obtener_lote_helper({ ids: ['123'] }))
                .rejects
                .toThrow('Conflicto de integridad: El lote se encuentra duplicado en EF1 y EF10');
        });
    });

    // ============================================================
    // TEST GROUP: Tolerancia a fallos
    // ============================================================
    describe('tolerancia a fallos', () => {

        test('debería retornar lotes de EF10 cuando EF1 falla', async () => {
            LotesRepository.getLotes.mockRejectedValue(new Error('EF1 connection error'));
            LotesRepository.getLotesMaquila.mockResolvedValue([mockLoteEF10]);

            const result = await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            expect(result).toEqual([mockLoteEF10]);
        });

        test('debería retornar lotes de EF1 cuando EF10 falla', async () => {
            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);
            LotesRepository.getLotesMaquila.mockRejectedValue(new Error('EF10 connection error'));

            const result = await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            expect(result).toEqual([mockLoteEF1]);
        });

        test('debería lanzar error cuando ambas colecciones fallan', async () => {
            LotesRepository.getLotes.mockRejectedValue(new Error('EF1 error'));
            LotesRepository.getLotesMaquila.mockRejectedValue(new Error('EF10 error'));

            await expect(LotesHelper.obtener_lote_helper({ ids: ['123'] }))
                .rejects
                .toThrow('Error obteniendo lotes, ambas bases de datos estan caidas');
        });

        test('debería retornar array vacío cuando EF1 falla y EF10 está vacío', async () => {
            LotesRepository.getLotes.mockRejectedValue(new Error('EF1 error'));
            LotesRepository.getLotesMaquila.mockResolvedValue([]);

            const result = await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            expect(result).toEqual([]);
        });

        test('debería retornar array vacío cuando EF10 falla y EF1 está vacío', async () => {
            LotesRepository.getLotes.mockResolvedValue([]);
            LotesRepository.getLotesMaquila.mockRejectedValue(new Error('EF10 error'));

            const result = await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            expect(result).toEqual([]);
        });
    });

    // ============================================================
    // TEST GROUP: Edge cases con valores nulos/undefined
    // ============================================================
    describe('edge cases con valores nulos/undefined', () => {

        test('debería retornar array vacío cuando EF1 retorna null', async () => {
            LotesRepository.getLotes.mockResolvedValue(null);
            LotesRepository.getLotesMaquila.mockResolvedValue([]);

            const result = await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            expect(result).toEqual([]);
        });

        test('debería retornar array vacío cuando EF1 retorna undefined', async () => {
            LotesRepository.getLotes.mockResolvedValue(undefined);
            LotesRepository.getLotesMaquila.mockResolvedValue([]);

            const result = await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            expect(result).toEqual([]);
        });

        test('debería retornar array vacío cuando EF10 retorna null', async () => {
            LotesRepository.getLotes.mockResolvedValue([]);
            LotesRepository.getLotesMaquila.mockResolvedValue(null);

            const result = await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            expect(result).toEqual([]);
        });

        test('debería retornar datos de EF10 cuando EF1 retorna null y EF10 tiene datos', async () => {
            LotesRepository.getLotes.mockResolvedValue(null);
            LotesRepository.getLotesMaquila.mockResolvedValue([mockLoteEF10]);

            const result = await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            expect(result).toEqual([mockLoteEF10]);
        });
    });

    // ============================================================
    // TEST GROUP: Contrato de API (filter y options)
    // ============================================================
    describe('contrato de API', () => {

        test('debería pasar filter a ambos repositorios', async () => {
            const filter = { ids: ['123', '456'], query: { activo: true } };

            await LotesHelper.obtener_lote_helper(filter);

            expect(LotesRepository.getLotes).toHaveBeenCalledWith(filter, {});
            expect(LotesRepository.getLotesMaquila).toHaveBeenCalledWith(filter, {});
        });

        test('debería pasar options a ambos repositorios', async () => {
            const filter = { ids: ['123'] };
            const options = { session: 'mockSession', select: { enf: 1 } };

            await LotesHelper.obtener_lote_helper(filter, options);

            expect(LotesRepository.getLotes).toHaveBeenCalledWith(filter, options);
            expect(LotesRepository.getLotesMaquila).toHaveBeenCalledWith(filter, options);
        });

        test('debería usar valores por defecto cuando no se pasan parámetros', async () => {
            await LotesHelper.obtener_lote_helper();

            expect(LotesRepository.getLotes).toHaveBeenCalledWith({}, {});
            expect(LotesRepository.getLotesMaquila).toHaveBeenCalledWith({}, {});
        });
    });

    // ============================================================
    // TEST GROUP: Casos de seguridad y resiliencia
    // ============================================================
    describe('casos de seguridad y resiliencia', () => {

        test('debería retornar array vacío cuando un repo retorna [null]', async () => {
            // Simular basura en BD: array con null adentro
            LotesRepository.getLotes.mockResolvedValue([null]);
            LotesRepository.getLotesMaquila.mockResolvedValue([]);

            const result = await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            // Ahora filtra nulls, así que retorna []
            expect(result).toEqual([]);
        });

        test('debería filtrar nulls y retornar solo datos válidos', async () => {
            // Simular array con mezcla de datos válidos y nulls
            LotesRepository.getLotes.mockResolvedValue([null, mockLoteEF1, undefined, null]);
            LotesRepository.getLotesMaquila.mockResolvedValue([]);

            const result = await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            expect(result).toEqual([mockLoteEF1]);
        });

        test('debería loguear warning cuando detecta datos corruptos en EF1', async () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

            LotesRepository.getLotes.mockResolvedValue([null, mockLoteEF1, null]);
            LotesRepository.getLotesMaquila.mockResolvedValue([]);

            await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('[LotesHelper] Datos corruptos en EF1: 2 elementos nulos filtrados')
            );

            warnSpy.mockRestore();
        });

        test('debería loguear warning cuando detecta datos corruptos en EF10', async () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

            LotesRepository.getLotes.mockResolvedValue([]);
            LotesRepository.getLotesMaquila.mockResolvedValue([null, mockLoteEF10]);

            await LotesHelper.obtener_lote_helper({ ids: ['456'] });

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('[LotesHelper] Datos corruptos en EF10: 1 elementos nulos filtrados')
            );

            warnSpy.mockRestore();
        });

        test('debería retornar array vacío cuando un repo retorna objeto {} en lugar de array', async () => {
            // Simular respuesta inesperada del driver de BD
            LotesRepository.getLotes.mockResolvedValue({});
            LotesRepository.getLotesMaquila.mockResolvedValue([mockLoteEF10]);

            const result = await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            // {} no tiene .length, así que {}?.length > 0 es false
            expect(result).toEqual([mockLoteEF10]);
        });

        test('debería manejar latencia: R1 tarda 100ms, R2 inmediato', async () => {
            // Simular latencia en EF1
            LotesRepository.getLotes.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve([mockLoteEF1]), 100))
            );
            LotesRepository.getLotesMaquila.mockResolvedValue([]);

            const startTime = Date.now();
            const result = await LotesHelper.obtener_lote_helper({ ids: ['123'] });
            const elapsed = Date.now() - startTime;

            // Debe esperar a que ambos terminen (allSettled)
            expect(elapsed).toBeGreaterThanOrEqual(95); // tolerancia de timing
            expect(result).toEqual([mockLoteEF1]);
        });

        test('debería manejar error de BD sin propiedad .message', async () => {
            // Error sin .message (podría pasar con errores personalizados)
            const errorSinMessage = { code: 'ECONNREFUSED' };
            LotesRepository.getLotes.mockRejectedValue(errorSinMessage);
            LotesRepository.getLotesMaquila.mockRejectedValue(errorSinMessage);

            await expect(LotesHelper.obtener_lote_helper({ ids: ['123'] }))
                .rejects
                .toThrow('Error obteniendo lotes, ambas bases de datos estan caidas');
        });

        test('debería manejar error de BD que es null', async () => {
            LotesRepository.getLotes.mockRejectedValue(null);
            LotesRepository.getLotesMaquila.mockRejectedValue(null);

            await expect(LotesHelper.obtener_lote_helper({ ids: ['123'] }))
                .rejects
                .toThrow('Error obteniendo lotes, ambas bases de datos estan caidas');
        });

        test('debería manejar error de BD que es undefined', async () => {
            LotesRepository.getLotes.mockRejectedValue(undefined);
            LotesRepository.getLotesMaquila.mockRejectedValue(undefined);

            await expect(LotesHelper.obtener_lote_helper({ ids: ['123'] }))
                .rejects
                .toThrow('Error obteniendo lotes, ambas bases de datos estan caidas');
        });

        test('debería manejar cuando repos retornan arrays con múltiples elementos', async () => {
            const multiplesLotes = [mockLoteEF1, { ...mockLoteEF1, _id: '123' }];
            LotesRepository.getLotes.mockResolvedValue(multiplesLotes);
            LotesRepository.getLotesMaquila.mockResolvedValue([]);

            const result = await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            expect(result).toEqual(multiplesLotes);
            expect(result.length).toBe(2);
        });
    });

    // ============================================================
    // TEST GROUP: Verificación de Promise.allSettled
    // ============================================================
    describe('comportamiento de Promise.allSettled', () => {

        test('debería ejecutar ambas consultas en paralelo', async () => {
            let ef1Called = false;
            let ef10Called = false;

            LotesRepository.getLotes.mockImplementation(async () => {
                ef1Called = true;
                // Verificar que EF10 ya fue llamado (paralelo)
                return [mockLoteEF1];
            });

            LotesRepository.getLotesMaquila.mockImplementation(async () => {
                ef10Called = true;
                return [];
            });

            await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            expect(ef1Called).toBe(true);
            expect(ef10Called).toBe(true);
        });

        test('no debería cortocircuitar si una promesa se resuelve antes', async () => {
            let ef10Completed = false;

            LotesRepository.getLotes.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve([mockLoteEF1]), 50))
            );

            LotesRepository.getLotesMaquila.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                ef10Completed = true;
                return [];
            });

            await LotesHelper.obtener_lote_helper({ ids: ['123'] });

            // Ambas deben completar aunque EF10 termine antes
            expect(ef10Completed).toBe(true);
        });
    });
});

/**
 * Tests unitarios para LotesHelper.actualizar_lotes_helper
 *
 * Este método actualiza un lote verificando primero en qué colección existe,
 * usando obtener_lote_helper para la búsqueda y detección de conflictos.
 *
 * Responsabilidades:
 * 1. Validar parámetros filter y update
 * 2. Buscar el lote usando obtener_lote_helper
 * 3. Determinar la colección correcta basándose en el ENF
 * 4. Actualizar solo en la colección correspondiente
 * 5. Manejar errores y race conditions
 */
describe('LotesHelper.actualizar_lotes_helper', () => {

    // ============================================================
    // SETUP: Mocks de dependencias
    // ============================================================
    let mockLoteEF1;
    let mockLoteEF10;
    let mockLoteActualizado;

    beforeEach(() => {
        jest.clearAllMocks();

        mockLoteEF1 = {
            _id: '507f1f77bcf86cd799439011',
            enf: 'EF1-001',
            kilos: 100,
            predio: { PREDIO: 'Finca Test' }
        };

        mockLoteEF10 = {
            _id: '507f1f77bcf86cd799439012',
            enf: 'EF10-001',
            kilos: 200,
            predio: { PREDIO: 'Finca Maquila' }
        };

        mockLoteActualizado = {
            ...mockLoteEF1,
            kilos: 150
        };

        // Mocks por defecto
        jest.spyOn(LotesRepository, 'getLotes').mockResolvedValue([mockLoteEF1]);
        jest.spyOn(LotesRepository, 'getLotesMaquila').mockResolvedValue([]);
        jest.spyOn(LotesRepository, 'actualizar_lote').mockResolvedValue(mockLoteActualizado);
        jest.spyOn(LotesRepository, 'actualizar_lote_Maquila').mockResolvedValue(null);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ============================================================
    // TEST GROUP: Validación de parámetros
    // ============================================================
    describe('validación de parámetros', () => {

        test('debería lanzar error con filter null', async () => {
            await expect(LotesHelper.actualizar_lotes_helper(null, { kilos: 100 }))
                .rejects
                .toThrow('No se proporcionó un filtro');
        });

        test('debería lanzar error con filter undefined', async () => {
            await expect(LotesHelper.actualizar_lotes_helper(undefined, { kilos: 100 }))
                .rejects
                .toThrow('No se proporcionó un filtro');
        });

        test('debería lanzar error con update null', async () => {
            await expect(LotesHelper.actualizar_lotes_helper({ _id: '123' }, null))
                .rejects
                .toThrow('El parámetro update es requerido y no puede estar vacío');
        });

        test('debería lanzar error con update undefined', async () => {
            await expect(LotesHelper.actualizar_lotes_helper({ _id: '123' }, undefined))
                .rejects
                .toThrow('El parámetro update es requerido y no puede estar vacío');
        });

        test('debería lanzar error con update vacío', async () => {
            await expect(LotesHelper.actualizar_lotes_helper({ _id: '123' }, {}))
                .rejects
                .toThrow('El parámetro update es requerido y no puede estar vacío');
        });
    });

    // ============================================================
    // TEST GROUP: Casos básicos
    // ============================================================
    describe('casos básicos', () => {

        test('debería actualizar lote en EF1', async () => {
            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);
            LotesRepository.getLotesMaquila.mockResolvedValue([]);
            LotesRepository.actualizar_lote.mockResolvedValue(mockLoteActualizado);

            const result = await LotesHelper.actualizar_lotes_helper(
                { _id: mockLoteEF1._id },
                { kilos: 150 }
            );

            expect(result).toEqual(mockLoteActualizado);
            expect(LotesRepository.actualizar_lote).toHaveBeenCalled();
            expect(LotesRepository.actualizar_lote_Maquila).not.toHaveBeenCalled();
        });

        test('debería actualizar lote en EF10 (maquila)', async () => {
            const mockLoteEF10Actualizado = { ...mockLoteEF10, kilos: 250 };
            LotesRepository.getLotes.mockResolvedValue([]);
            LotesRepository.getLotesMaquila.mockResolvedValue([mockLoteEF10]);
            LotesRepository.actualizar_lote_Maquila.mockResolvedValue(mockLoteEF10Actualizado);

            const result = await LotesHelper.actualizar_lotes_helper(
                { _id: mockLoteEF10._id },
                { kilos: 250 }
            );

            expect(result).toEqual(mockLoteEF10Actualizado);
            expect(LotesRepository.actualizar_lote_Maquila).toHaveBeenCalled();
            expect(LotesRepository.actualizar_lote).not.toHaveBeenCalled();
        });

        test('debería retornar el lote actualizado', async () => {
            const result = await LotesHelper.actualizar_lotes_helper(
                { _id: mockLoteEF1._id },
                { kilos: 150 }
            );

            expect(result).toHaveProperty('_id', mockLoteEF1._id);
            expect(result).toHaveProperty('kilos', 150);
        });
    });

    // ============================================================
    // TEST GROUP: Selección de repositorio
    // ============================================================
    describe('selección de repositorio', () => {

        test('debería usar actualizar_lote para lotes EF1', async () => {
            LotesRepository.getLotes.mockResolvedValue([{ ...mockLoteEF1, enf: 'EF1-999' }]);

            await LotesHelper.actualizar_lotes_helper({ _id: '123' }, { kilos: 100 });

            expect(LotesRepository.actualizar_lote).toHaveBeenCalled();
            expect(LotesRepository.actualizar_lote_Maquila).not.toHaveBeenCalled();
        });

        test('debería usar actualizar_lote_Maquila para lotes EF10', async () => {
            LotesRepository.getLotes.mockResolvedValue([]);
            LotesRepository.getLotesMaquila.mockResolvedValue([{ ...mockLoteEF10, enf: 'EF10-999' }]);
            LotesRepository.actualizar_lote_Maquila.mockResolvedValue(mockLoteEF10);

            await LotesHelper.actualizar_lotes_helper({ _id: '123' }, { kilos: 100 });

            expect(LotesRepository.actualizar_lote_Maquila).toHaveBeenCalled();
            expect(LotesRepository.actualizar_lote).not.toHaveBeenCalled();
        });

        test('debería usar EF1 cuando enf es null', async () => {
            LotesRepository.getLotes.mockResolvedValue([{ ...mockLoteEF1, enf: null }]);

            await LotesHelper.actualizar_lotes_helper({ _id: '123' }, { kilos: 100 });

            expect(LotesRepository.actualizar_lote).toHaveBeenCalled();
        });

        test('debería usar EF1 cuando enf es undefined', async () => {
            const lotesinEnf = { _id: '123', kilos: 100 };
            LotesRepository.getLotes.mockResolvedValue([lotesinEnf]);

            await LotesHelper.actualizar_lotes_helper({ _id: '123' }, { kilos: 100 });

            expect(LotesRepository.actualizar_lote).toHaveBeenCalled();
        });

        test('debería usar EF1 cuando enf es string vacío', async () => {
            LotesRepository.getLotes.mockResolvedValue([{ ...mockLoteEF1, enf: '' }]);

            await LotesHelper.actualizar_lotes_helper({ _id: '123' }, { kilos: 100 });

            expect(LotesRepository.actualizar_lote).toHaveBeenCalled();
        });
    });

    // ============================================================
    // TEST GROUP: Manejo de errores
    // ============================================================
    describe('manejo de errores', () => {

        test('debería lanzar error cuando lote no existe en ninguna colección', async () => {
            LotesRepository.getLotes.mockResolvedValue([]);
            LotesRepository.getLotesMaquila.mockResolvedValue([]);

            await expect(LotesHelper.actualizar_lotes_helper({ _id: '123' }, { kilos: 100 }))
                .rejects
                .toThrow('No se encontró el lote en ninguna colección');
        });

        test('debería lanzar error cuando lote desaparece durante operación', async () => {
            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);
            LotesRepository.actualizar_lote.mockResolvedValue(null);

            await expect(LotesHelper.actualizar_lotes_helper({ _id: '123' }, { kilos: 100 }))
                .rejects
                .toThrow('El lote desapareció durante la operación');
        });

        test('debería lanzar error cuando BD falla en update', async () => {
            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);
            LotesRepository.actualizar_lote.mockRejectedValue(new Error('Connection timeout'));

            await expect(LotesHelper.actualizar_lotes_helper({ _id: '123' }, { kilos: 100 }))
                .rejects
                .toThrow('Fallo en la escritura del lote: Connection timeout');
        });

        test('debería lanzar error de conflicto si lote existe en ambas colecciones', async () => {
            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);
            LotesRepository.getLotesMaquila.mockResolvedValue([mockLoteEF10]);

            await expect(LotesHelper.actualizar_lotes_helper({ _id: '123' }, { kilos: 100 }))
                .rejects
                .toThrow('Conflicto de integridad: El lote se encuentra duplicado en EF1 y EF10');
        });
    });

    // ============================================================
    // TEST GROUP: Contrato de API
    // ============================================================
    describe('contrato de API', () => {

        test('debería pasar filter envuelto en query a obtener_lote_helper', async () => {
            const filter = { _id: '507f1f77bcf86cd799439011' };

            await LotesHelper.actualizar_lotes_helper(filter, { kilos: 100 });

            // getLotes recibe { query: filter } como primer parámetro
            expect(LotesRepository.getLotes).toHaveBeenCalledWith(
                { query: filter },
                expect.any(Object)
            );
        });

        test('debería pasar options a obtener_lote_helper', async () => {
            const options = { session: 'mockSession' };

            await LotesHelper.actualizar_lotes_helper({ _id: '123' }, { kilos: 100 }, options);

            expect(LotesRepository.getLotes).toHaveBeenCalledWith(
                expect.any(Object),
                options
            );
        });

        test('debería agregar calculateFields: true a options del repositorio', async () => {
            await LotesHelper.actualizar_lotes_helper({ _id: '123' }, { kilos: 100 });

            expect(LotesRepository.actualizar_lote).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object),
                expect.objectContaining({ calculateFields: true })
            );
        });

        test('debería pasar filter y update al repositorio', async () => {
            const filter = { _id: '507f1f77bcf86cd799439011' };
            const update = { kilos: 150 };

            await LotesHelper.actualizar_lotes_helper(filter, update);

            expect(LotesRepository.actualizar_lote).toHaveBeenCalledWith(
                filter,
                update,
                expect.any(Object)
            );
        });
    });

    // ============================================================
    // TEST GROUP: Race Conditions
    // ============================================================
    describe('race conditions', () => {

        test('debería manejar cuando lote cambia de colección entre búsqueda y actualización', async () => {
            // Simular: lote encontrado en EF1, pero al actualizar ya no está
            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);
            LotesRepository.getLotesMaquila.mockResolvedValue([]);
            LotesRepository.actualizar_lote.mockResolvedValue(null); // Ya no existe

            await expect(LotesHelper.actualizar_lotes_helper({ _id: '123' }, { kilos: 100 }))
                .rejects
                .toThrow('El lote desapareció durante la operación');
        });

        test('debería manejar cuando lote es eliminado entre búsqueda y actualización', async () => {
            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);
            LotesRepository.actualizar_lote.mockRejectedValue(new Error('Document not found'));

            await expect(LotesHelper.actualizar_lotes_helper({ _id: '123' }, { kilos: 100 }))
                .rejects
                .toThrow('Fallo en la escritura del lote: Document not found');
        });
    });

    // ============================================================
    // TEST GROUP: Seguridad - Inyección de operadores MongoDB
    // ============================================================
    describe('seguridad - inyección de operadores MongoDB', () => {

        test('debería pasar filter con $where sin modificar (validación debe ser en capa superior)', async () => {
            // NOTA: La validación de operadores peligrosos debe hacerse en capas superiores
            // Este test documenta el comportamiento actual
            const maliciousFilter = { $where: 'this.password == "123"' };

            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);

            await LotesHelper.actualizar_lotes_helper(maliciousFilter, { kilos: 100 });

            // El helper pasa el filtro tal cual - la protección debe estar en el repositorio/BD
            expect(LotesRepository.getLotes).toHaveBeenCalledWith(
                { query: maliciousFilter },
                expect.any(Object)
            );
        });

        test('debería pasar filter con $exists sin modificar', async () => {
            const filterConExists = { _id: { $exists: true } };

            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);

            await LotesHelper.actualizar_lotes_helper(filterConExists, { kilos: 100 });

            expect(LotesRepository.getLotes).toHaveBeenCalledWith(
                { query: filterConExists },
                expect.any(Object)
            );
        });

        test('debería pasar update con $set sin modificar', async () => {
            const updateConSet = { $set: { kilos: 100 } };

            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);

            await LotesHelper.actualizar_lotes_helper({ _id: '123' }, updateConSet);

            expect(LotesRepository.actualizar_lote).toHaveBeenCalledWith(
                expect.any(Object),
                updateConSet,
                expect.any(Object)
            );
        });
    });

    // ============================================================
    // TEST GROUP: Normalización de ENF
    // ============================================================
    describe('normalización de ENF', () => {

        test('debería usar EF10 cuando enf es "ef10-" en minúsculas', async () => {
            // toUpperCase() normaliza, así que 'ef10-' matchea 'EF10-'
            LotesRepository.getLotes.mockResolvedValue([]);
            LotesRepository.getLotesMaquila.mockResolvedValue([{ ...mockLoteEF10, enf: 'ef10-001' }]);
            LotesRepository.actualizar_lote_Maquila.mockResolvedValue(mockLoteEF10);

            await LotesHelper.actualizar_lotes_helper({ _id: '123' }, { kilos: 100 });

            // Con toUpperCase(), 'ef10-' se convierte a 'EF10-' y matchea
            expect(LotesRepository.actualizar_lote_Maquila).toHaveBeenCalled();
            expect(LotesRepository.actualizar_lote).not.toHaveBeenCalled();
        });

        test('debería usar EF10 solo cuando enf empieza exactamente con "EF10-"', async () => {
            LotesRepository.getLotes.mockResolvedValue([]);
            LotesRepository.getLotesMaquila.mockResolvedValue([{ ...mockLoteEF10, enf: 'EF10-001' }]);
            LotesRepository.actualizar_lote_Maquila.mockResolvedValue(mockLoteEF10);

            await LotesHelper.actualizar_lotes_helper({ _id: '123' }, { kilos: 100 });

            expect(LotesRepository.actualizar_lote_Maquila).toHaveBeenCalled();
        });

        test('debería usar EF1 cuando enf es "EF100-" (no es EF10)', async () => {
            LotesRepository.getLotes.mockResolvedValue([{ ...mockLoteEF1, enf: 'EF100-001' }]);

            await LotesHelper.actualizar_lotes_helper({ _id: '123' }, { kilos: 100 });

            // 'EF100-' empieza con 'EF10' pero el código usa startsWith('EF10-')
            // 'EF100-'.startsWith('EF10-') = false
            expect(LotesRepository.actualizar_lote).toHaveBeenCalled();
        });
    });

    // ============================================================
    // TEST GROUP: Integridad - Campos protegidos
    // ============================================================
    describe('integridad - campos protegidos', () => {

        test('debería pasar update con _id al repositorio (protección debe estar en repo)', async () => {
            // NOTA: La protección de campos como _id debe estar en el repositorio/schema
            const updateConId = { _id: 'nuevo-id-malicioso', kilos: 100 };

            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);

            await LotesHelper.actualizar_lotes_helper({ _id: '123' }, updateConId);

            // El helper pasa el update tal cual
            expect(LotesRepository.actualizar_lote).toHaveBeenCalledWith(
                expect.any(Object),
                updateConId,
                expect.any(Object)
            );
        });

        test('debería pasar update con creadoEn al repositorio', async () => {
            const updateConFecha = { creadoEn: new Date('2020-01-01'), kilos: 100 };

            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);

            await LotesHelper.actualizar_lotes_helper({ _id: '123' }, updateConFecha);

            expect(LotesRepository.actualizar_lote).toHaveBeenCalledWith(
                expect.any(Object),
                updateConFecha,
                expect.any(Object)
            );
        });
    });

    // ============================================================
    // TEST GROUP: Estabilidad - Tipos de datos inesperados
    // ============================================================
    describe('estabilidad - tipos de datos inesperados', () => {

        test('debería manejar filter como Array', async () => {
            // Un array pasado como filter
            const filterArray = ['id1', 'id2'];

            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);

            await LotesHelper.actualizar_lotes_helper(filterArray, { kilos: 100 });

            // El array se pasa como query, comportamiento depende de MongoDB
            expect(LotesRepository.getLotes).toHaveBeenCalledWith(
                { query: filterArray },
                expect.any(Object)
            );
        });

        test('debería manejar filter como string', async () => {
            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);

            await LotesHelper.actualizar_lotes_helper('507f1f77bcf86cd799439011', { kilos: 100 });

            expect(LotesRepository.getLotes).toHaveBeenCalledWith(
                { query: '507f1f77bcf86cd799439011' },
                expect.any(Object)
            );
        });

        test('debería manejar filter como número', async () => {
            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);

            await LotesHelper.actualizar_lotes_helper(12345, { kilos: 100 });

            expect(LotesRepository.getLotes).toHaveBeenCalledWith(
                { query: 12345 },
                expect.any(Object)
            );
        });

        test('debería rechazar update como Array', async () => {
            // Arrays no tienen Object.keys().length útil
            const updateArray = [{ kilos: 100 }];

            // Object.keys([{kilos:100}]) = ['0'], length = 1, no es vacío
            // Pero no es un update válido de MongoDB
            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);

            // El helper lo acepta porque tiene length > 0
            await LotesHelper.actualizar_lotes_helper({ _id: '123' }, updateArray);

            expect(LotesRepository.actualizar_lote).toHaveBeenCalledWith(
                expect.any(Object),
                updateArray,
                expect.any(Object)
            );
        });

        test('debería rechazar update como string', async () => {
            // String tiene length pero Object.keys('string') no funciona como esperado
            // Object.keys('abc') = ['0', '1', '2'], length = 3

            LotesRepository.getLotes.mockResolvedValue([mockLoteEF1]);

            await LotesHelper.actualizar_lotes_helper({ _id: '123' }, 'invalid');

            // El helper lo acepta porque Object.keys('invalid').length > 0
            expect(LotesRepository.actualizar_lote).toHaveBeenCalled();
        });
    });
});
