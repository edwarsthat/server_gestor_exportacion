import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock del config ANTES de cualquier import que lo use
const mockConfig = {};
jest.unstable_mockModule('../../../src/config/index.js', () => ({
    default: mockConfig
}));

// Importar DESPUES de configurar el mock
const { InventarioDescartesRepository, InventariosHistorialRepository } = await import('../../../server/Class/Inventarios.js');
const { InventariosService } = await import('../../../server/services/inventarios.js');

/**
 * Tests unitarios para InventariosService.procesar_formulario_inventario_descarte
 *
 * Este metodo procesa un formulario de inventario de descarte:
 * 1. Parsea las claves del formulario (area:descarteId:tipo) para armar un mapa de kilos y canastillas
 * 2. Consulta registros ACTIVOS por cada combinacion area/descarte, ordenados por fecha (FIFO)
 * 3. Descuenta kilos y canastillas de los registros mas antiguos primero
 * 4. Marca registros como AGOTADO cuando ambos valores llegan a 0
 * 5. Registra la salida en el cardex
 * 6. Valida consistencia (no puede quedar kilos=0 con canastillas>0 o viceversa)
 * 7. Retorna los totales descontados
 */
describe('InventariosService.procesar_formulario_inventario_descarte', () => {

    const TIPO_FRUTA = '507f1f77bcf86cd799439011';
    const DESCARTE_ID = '507f1f77bcf86cd799439012';
    const AREA = 'LAVADO';
    const mockSession = { id: 'session-123' };
    const mockUser = { _id: 'user123' };

    let spyGetData;
    let spyActualizar;
    let spyCardex;

    beforeEach(() => {
        jest.clearAllMocks();
        spyGetData = jest.spyOn(InventarioDescartesRepository, 'get_data');
        spyActualizar = jest.spyOn(InventariosHistorialRepository, 'actualizar_registro_inventario_descarte').mockResolvedValue({});
        spyCardex = jest.spyOn(InventariosHistorialRepository, 'put_cardex_invetariosdescartes').mockResolvedValue({});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ============================================================
    // HELPERS
    // ============================================================
    function crearRegistro(id, kilosActuales, canastillasActuales = 0) {
        return { _id: id, kilosActuales, canastillasActuales };
    }

    // ============================================================
    // TEST GROUP: Parseo de datos de entrada
    // ============================================================
    describe('parseo de datos de entrada', () => {

        test('deberia interpretar clave sin tipo (area:descarteId) como kilos por defecto', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '10',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '2'
            };
            spyGetData.mockResolvedValue([crearRegistro('reg1', 50, 10)]);

            await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            const update = spyActualizar.mock.calls[0][1];
            expect(update.$set.kilosActuales).toBe(40);
            expect(update.$set.canastillasActuales).toBe(8);
        });

        test('deberia parsear correctamente claves con kilos y canastillas (area:descarteId:canastillas)', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '10',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '3'
            };
            spyGetData.mockResolvedValue([crearRegistro('reg1', 50, 10)]);

            const result = await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            expect(result).toEqual({ totalKilos: 10, totalCanastillas: 3 });
        });

        test('deberia tratar valores vacios como 0', async () => {
            const data = { [`${AREA}:${DESCARTE_ID}`]: '' };
            spyGetData.mockResolvedValue([crearRegistro('reg1', 50, 10)]);

            const result = await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            expect(result).toEqual({ totalKilos: 0, totalCanastillas: 0 });
            expect(spyActualizar).not.toHaveBeenCalled();
        });

        test('deberia lanzar error si el valor no es un numero', async () => {
            const data = { [`${AREA}:${DESCARTE_ID}`]: 'abc' };

            await expect(
                InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser)
            ).rejects.toThrow('El valor no es un numero');
        });

        test('deberia agrupar kilos y canastillas del mismo area:descarte', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}:kilos`]: '15',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '5'
            };
            spyGetData.mockResolvedValue([crearRegistro('reg1', 100, 20)]);

            const result = await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            expect(result).toEqual({ totalKilos: 15, totalCanastillas: 5 });
        });

        test('deberia manejar multiples combinaciones area:descarte', async () => {
            const DESCARTE_ID_2 = '507f1f77bcf86cd799439099';
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '10',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '2',
                [`ENCERADO:${DESCARTE_ID_2}`]: '20',
                [`ENCERADO:${DESCARTE_ID_2}:canastillas`]: '4'
            };

            spyGetData
                .mockResolvedValueOnce([crearRegistro('reg1', 50, 10)])
                .mockResolvedValueOnce([crearRegistro('reg2', 50, 10)]);

            const result = await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            expect(result).toEqual({ totalKilos: 30, totalCanastillas: 6 });
            expect(spyGetData).toHaveBeenCalledTimes(2);
        });

        test('deberia funcionar con objeto data vacio', async () => {
            const data = {};

            const result = await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            expect(result).toEqual({ totalKilos: 0, totalCanastillas: 0 });
            expect(spyGetData).not.toHaveBeenCalled();
        });
    });

    // ============================================================
    // TEST GROUP: Descuento de un solo registro
    // ============================================================
    describe('descuento de un solo registro', () => {

        test('deberia descontar kilos y canastillas parcialmente sin marcar AGOTADO', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '10',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '2'
            };
            spyGetData.mockResolvedValue([crearRegistro('reg1', 50, 10)]);

            await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            expect(spyActualizar).toHaveBeenCalledWith(
                { _id: 'reg1' },
                { $set: { kilosActuales: 40, canastillasActuales: 8 } },
                { user: 'user123', action: 'Actualizar inventario descarte reproceso predio', session: mockSession }
            );
        });

        test('deberia marcar AGOTADO cuando kilos y canastillas llegan a 0', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '50',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '5'
            };
            spyGetData.mockResolvedValue([crearRegistro('reg1', 50, 5)]);

            await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            expect(spyActualizar).toHaveBeenCalledWith(
                { _id: 'reg1' },
                { $set: { kilosActuales: 0, canastillasActuales: 0, estado: 'AGOTADO' } },
                expect.any(Object)
            );
        });
    });

    // ============================================================
    // TEST GROUP: Descuento FIFO de multiples registros
    // ============================================================
    describe('descuento FIFO de multiples registros', () => {

        test('deberia descontar del primer registro y pasar al segundo si no alcanza', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '80',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '15'
            };
            spyGetData.mockResolvedValue([
                crearRegistro('reg1', 50, 10),
                crearRegistro('reg2', 50, 10)
            ]);

            await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            // reg1: 50 kilos y 10 canastillas descontados -> AGOTADO
            expect(spyActualizar).toHaveBeenNthCalledWith(1,
                { _id: 'reg1' },
                { $set: { kilosActuales: 0, canastillasActuales: 0, estado: 'AGOTADO' } },
                expect.any(Object)
            );
            // reg2: 30 kilos y 5 canastillas descontados -> parcial
            expect(spyActualizar).toHaveBeenNthCalledWith(2,
                { _id: 'reg2' },
                { $set: { kilosActuales: 20, canastillasActuales: 5 } },
                expect.any(Object)
            );
        });

        test('deberia detenerse cuando kilos y canastillas se agotan sin tocar registros restantes', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '30',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '5'
            };
            spyGetData.mockResolvedValue([
                crearRegistro('reg1', 30, 5),
                crearRegistro('reg2', 50, 10),
                crearRegistro('reg3', 50, 10)
            ]);

            await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            // Solo reg1 deberia haberse actualizado (AGOTADO)
            expect(spyActualizar).toHaveBeenCalledTimes(1);
            expect(spyActualizar).toHaveBeenCalledWith(
                { _id: 'reg1' },
                { $set: { kilosActuales: 0, canastillasActuales: 0, estado: 'AGOTADO' } },
                expect.any(Object)
            );
        });

        test('deberia descontar canastillas de multiples registros FIFO', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '1',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '8'
            };
            spyGetData.mockResolvedValue([
                crearRegistro('reg1', 100, 5),
                crearRegistro('reg2', 100, 10)
            ]);

            await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            // reg1: 1 kilo y 5 canastillas descontadas
            const update1 = spyActualizar.mock.calls[0][1];
            expect(update1.$set.canastillasActuales).toBe(0);
            expect(update1.$set.kilosActuales).toBe(99);

            // reg2: 3 canastillas descontadas, kilos intactos
            const update2 = spyActualizar.mock.calls[1][1];
            expect(update2.$set.canastillasActuales).toBe(7);
            expect(update2.$set.kilosActuales).toBe(100);
        });
    });

    // ============================================================
    // TEST GROUP: Registro en cardex
    // ============================================================
    describe('registro en cardex', () => {

        test('deberia registrar kilos descontados en el cardex por cada registro tocado', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '80',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '15'
            };
            spyGetData.mockResolvedValue([
                crearRegistro('reg1', 50, 10),
                crearRegistro('reg2', 50, 10)
            ]);

            await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            // Cardex del reg1: 50 kilos
            expect(spyCardex).toHaveBeenNthCalledWith(1,
                {},
                { $inc: { [`kilos_salida.${TIPO_FRUTA}.${AREA}.${DESCARTE_ID}`]: 50 } },
                { sort: { fecha: -1 }, new: true, session: mockSession }
            );
            // Cardex del reg2: 30 kilos
            expect(spyCardex).toHaveBeenNthCalledWith(2,
                {},
                { $inc: { [`kilos_salida.${TIPO_FRUTA}.${AREA}.${DESCARTE_ID}`]: 30 } },
                { sort: { fecha: -1 }, new: true, session: mockSession }
            );
        });

        test('no deberia registrar en cardex si no se descontaron kilos ni canastillas', async () => {
            const data = { [`${AREA}:${DESCARTE_ID}`]: '' };
            spyGetData.mockResolvedValue([crearRegistro('reg1', 50, 10)]);

            await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            expect(spyCardex).not.toHaveBeenCalled();
        });
    });

    // ============================================================
    // TEST GROUP: Validacion de consistencia (nuevas validaciones)
    // ============================================================
    describe('validacion de consistencia', () => {

        test('deberia lanzar error si quedan kilos=0 pero canastillas>0 en el inventario', async () => {
            // Deducir TODOS los kilos pero solo algunas canastillas
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '100',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '5'
            };
            spyGetData.mockResolvedValue([
                crearRegistro('reg1', 50, 10),
                crearRegistro('reg2', 50, 10)
            ]);

            await expect(
                InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser)
            ).rejects.toThrow('Inconsistencia');
        });

        test('deberia lanzar error si quedan canastillas=0 pero kilos>0 en el inventario', async () => {
            // Deducir TODAS las canastillas pero solo algunos kilos
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '5',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '20'
            };
            spyGetData.mockResolvedValue([
                crearRegistro('reg1', 50, 10),
                crearRegistro('reg2', 50, 10)
            ]);

            await expect(
                InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser)
            ).rejects.toThrow('Inconsistencia');
        });

        test('NO deberia lanzar error si ambos quedan en 0', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '100',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '20'
            };
            spyGetData.mockResolvedValue([
                crearRegistro('reg1', 50, 10),
                crearRegistro('reg2', 50, 10)
            ]);

            const result = await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            expect(result).toEqual({ totalKilos: 100, totalCanastillas: 20 });
        });

        test('NO deberia lanzar error si ambos quedan > 0', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '10',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '3'
            };
            spyGetData.mockResolvedValue([crearRegistro('reg1', 50, 10)]);

            const result = await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            expect(result).toEqual({ totalKilos: 10, totalCanastillas: 3 });
        });
    });

    // ============================================================
    // TEST GROUP: Errores de inventario insuficiente
    // ============================================================
    describe('errores de inventario insuficiente', () => {

        test('deberia lanzar Error si no hay registros ACTIVOS para el area/descarte', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '10',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '1'
            };
            spyGetData.mockResolvedValue([]);

            await expect(
                InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser)
            ).rejects.toThrow('No hay inventario suficiente');
        });

        test('deberia lanzar Error si los kilos solicitados superan el inventario total', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '200',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '5'
            };
            spyGetData.mockResolvedValue([
                crearRegistro('reg1', 50, 10),
                crearRegistro('reg2', 50, 10)
            ]);

            await expect(
                InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser)
            ).rejects.toThrow('El descuento supera el inventario disponible');
        });

        test('deberia lanzar Error si las canastillas solicitadas superan el inventario total', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '5',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '50'
            };
            spyGetData.mockResolvedValue([
                crearRegistro('reg1', 50, 10),
                crearRegistro('reg2', 50, 10)
            ]);

            await expect(
                InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser)
            ).rejects.toThrow('El descuento supera el inventario disponible');
        });
    });

    // ============================================================
    // TEST GROUP: Query al repositorio
    // ============================================================
    describe('query al repositorio', () => {

        test('deberia consultar con los filtros correctos', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '10',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '2'
            };
            spyGetData.mockResolvedValue([crearRegistro('reg1', 50, 10)]);

            await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            expect(spyGetData).toHaveBeenCalledWith({
                query: {
                    tipoFruta: TIPO_FRUTA,
                    area: AREA,
                    tipoDescarte: DESCARTE_ID,
                    estado: 'ACTIVO',
                    loteType: { $in: ['Lote', 'Loteef8'] }
                },
                sort: { fechaIngreso: 1 }
            }, { session: mockSession });
        });

        test('deberia usar el area correcta de cada entrada', async () => {
            const data = {
                [`ENCERADO:${DESCARTE_ID}`]: '5',
                [`ENCERADO:${DESCARTE_ID}:canastillas`]: '1'
            };
            spyGetData.mockResolvedValue([crearRegistro('reg1', 50, 10)]);

            await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            expect(spyGetData).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: expect.objectContaining({ area: 'ENCERADO' })
                }),
                { session: mockSession }
            );
        });
    });

    // ============================================================
    // TEST GROUP: Totales retornados
    // ============================================================
    describe('totales retornados', () => {

        test('deberia retornar la suma de todos los kilos y canastillas solicitados', async () => {
            const DESCARTE_ID_2 = '507f1f77bcf86cd799439099';
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '10',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '3',
                [`ENCERADO:${DESCARTE_ID_2}`]: '20',
                [`ENCERADO:${DESCARTE_ID_2}:canastillas`]: '7'
            };

            spyGetData
                .mockResolvedValueOnce([crearRegistro('reg1', 100, 50)])
                .mockResolvedValueOnce([crearRegistro('reg2', 100, 50)]);

            const result = await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            expect(result).toEqual({ totalKilos: 30, totalCanastillas: 10 });
        });

        test('deberia retornar 0 para ambos si solo se envian valores vacios', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: ''
            };
            spyGetData.mockResolvedValue([crearRegistro('reg1', 50, 10)]);

            const result = await InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser);

            expect(result).toEqual({ totalKilos: 0, totalCanastillas: 0 });
        });
    });

    // ============================================================
    // TEST GROUP: Propagacion de errores de repositorios
    // ============================================================
    describe('propagacion de errores de repositorios', () => {

        test('deberia propagar errores de InventarioDescartesRepository.get_data', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '10',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '1'
            };
            spyGetData.mockRejectedValue(new Error('DB connection lost'));

            await expect(
                InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser)
            ).rejects.toThrow('DB connection lost');
        });

        test('deberia propagar errores de actualizar_registro_inventario_descarte', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '10',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '1'
            };
            spyGetData.mockResolvedValue([crearRegistro('reg1', 50, 10)]);
            spyActualizar.mockRejectedValue(new Error('Write conflict'));

            await expect(
                InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser)
            ).rejects.toThrow('Write conflict');
        });

        test('deberia propagar errores de put_cardex_invetariosdescartes', async () => {
            const data = {
                [`${AREA}:${DESCARTE_ID}`]: '10',
                [`${AREA}:${DESCARTE_ID}:canastillas`]: '1'
            };
            spyGetData.mockResolvedValue([crearRegistro('reg1', 50, 10)]);
            spyCardex.mockRejectedValue(new Error('Cardex update failed'));

            await expect(
                InventariosService.procesar_formulario_inventario_descarte(data, TIPO_FRUTA, mockSession, mockUser)
            ).rejects.toThrow('Cardex update failed');
        });
    });
});
