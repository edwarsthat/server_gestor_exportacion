import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// ============================================================
// SETUP: Mocks de la base de datos
// ============================================================
const mockSessionFn = jest.fn();
const mockFindOne = jest.fn(() => ({ session: mockSessionFn }));
const mockUpdateOne = jest.fn();
const mockCreate = jest.fn();
const mockSave = jest.fn();

// Mock del constructor de InventarioActualDescarte
// Se usa tanto como constructor (new) como objeto con métodos estáticos
function MockInventarioActualDescarte(data) {
    Object.assign(this, data);
    this.save = mockSave;
}
MockInventarioActualDescarte.findOne = mockFindOne;
MockInventarioActualDescarte.updateOne = mockUpdateOne;

const MockInventarioMovimientoDescarte = {
    create: mockCreate
};

jest.unstable_mockModule('../../../DB/mongoDB/config/init.js', () => ({
    db: {
        InventarioActualDescarte: MockInventarioActualDescarte,
        InventarioMovimientoDescarte: MockInventarioMovimientoDescarte,
    }
}));

jest.unstable_mockModule('../../../src/config/index.js', () => ({
    default: {}
}));

// Importar después de los mocks
const { InventariosHistorialRepository } = await import('../../../server/Class/Inventarios.js');
const { PostError } = await import('../../../Error/ConnectionErrors.js');

/**
 * Tests unitarios para InventariosHistorialRepository.add_elemento_inventarioDescartes
 *
 * Este método agrega un registro de descarte al inventario.
 * Si ya existe un registro ACTIVO con la misma combinación de
 * (lote, tipoFruta, area, tipoDescarte, loteType), incrementa los kilos/canastillas.
 * Si no existe, crea uno nuevo.
 * En ambos casos, crea un movimiento de INGRESO.
 */
describe('InventariosHistorialRepository.add_elemento_inventarioDescartes', () => {

    // ============================================================
    // SETUP: Datos de prueba
    // ============================================================
    const mockUserId = '507f1f77bcf86cd799439099';
    const mockSession = { id: 'mock-session' };
    let validData;

    beforeEach(() => {
        jest.clearAllMocks();

        validData = {
            lote: '507f1f77bcf86cd799439011',
            tipoFruta: '507f1f77bcf86cd799439022',
            area: 'ENCERADO',
            tipoDescarte: '507f1f77bcf86cd799439033',
            kilos: 150,
            canastillas: 8,
            loteType: 'Lote'
        };

        // Defaults: no existe registro previo, save y create exitosos
        mockSessionFn.mockResolvedValue(null);
        mockSave.mockResolvedValue({
            _id: 'new-descarte-id',
            ...validData,
            kilosIniciales: validData.kilos,
            kilosActuales: validData.kilos,
            canastillasIniciales: validData.canastillas,
            canastillasActuales: validData.canastillas,
            user: mockUserId,
            fechaIngreso: new Date(),
        });
        mockCreate.mockResolvedValue([{ _id: 'new-movimiento-id' }]);
        mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ============================================================
    // TEST GROUP: Validación de parámetros
    // ============================================================
    describe('validación de parámetros', () => {

        const camposRequeridos = ['lote', 'tipoFruta', 'area', 'tipoDescarte', 'kilos', 'loteType'];

        test.each(camposRequeridos)(
            'debería lanzar PostError cuando falta el campo "%s"',
            async (campo) => {
                const dataIncompleta = { ...validData };
                delete dataIncompleta[campo];

                await expect(
                    InventariosHistorialRepository.add_elemento_inventarioDescartes(dataIncompleta, mockUserId, { session: mockSession })
                ).rejects.toThrow(PostError);

                await expect(
                    InventariosHistorialRepository.add_elemento_inventarioDescartes(dataIncompleta, mockUserId, { session: mockSession })
                ).rejects.toThrow('Faltan datos para agregar el elemento al inventario de descartes');
            }
        );

        test('debería lanzar PostError cuando kilos es NaN', async () => {
            validData.kilos = 'abc';

            await expect(
                InventariosHistorialRepository.add_elemento_inventarioDescartes(validData, mockUserId, { session: mockSession })
            ).rejects.toThrow('El campo kilos debe ser un número');
        });

        test('debería lanzar PostError cuando kilos es Infinity', async () => {
            validData.kilos = Infinity;

            await expect(
                InventariosHistorialRepository.add_elemento_inventarioDescartes(validData, mockUserId, { session: mockSession })
            ).rejects.toThrow('El campo kilos debe ser un número finito');
        });

        test('debería lanzar PostError cuando kilos es -Infinity', async () => {
            validData.kilos = -Infinity;

            await expect(
                InventariosHistorialRepository.add_elemento_inventarioDescartes(validData, mockUserId, { session: mockSession })
            ).rejects.toThrow('El campo kilos debe ser un número finito');
        });

        test('debería lanzar PostError cuando kilos es 0', async () => {
            validData.kilos = 0;

            await expect(
                InventariosHistorialRepository.add_elemento_inventarioDescartes(validData, mockUserId, { session: mockSession })
            ).rejects.toThrow('Faltan datos para agregar el elemento al inventario de descartes');
        });

        test('debería lanzar PostError cuando kilos es negativo', async () => {
            validData.kilos = -10;

            await expect(
                InventariosHistorialRepository.add_elemento_inventarioDescartes(validData, mockUserId, { session: mockSession })
            ).rejects.toThrow('El campo kilos debe ser mayor a 0');
        });

        test('debería lanzar PostError con data vacía', async () => {
            await expect(
                InventariosHistorialRepository.add_elemento_inventarioDescartes({}, mockUserId, { session: mockSession })
            ).rejects.toThrow(PostError);
        });
    });

    // ============================================================
    // TEST GROUP: Crear nuevo registro (no existe previo)
    // ============================================================
    describe('crear nuevo registro', () => {

        test('debería crear un nuevo InventarioActualDescarte cuando no existe registro previo', async () => {
            const result = await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                validData, mockUserId, { session: mockSession }
            );

            expect(mockSave).toHaveBeenCalledWith({ session: mockSession });
            expect(result).toBeDefined();
            expect(result._id).toBe('new-descarte-id');
        });

        test('debería crear movimiento de INGRESO inicial', async () => {
            await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                validData, mockUserId, { session: mockSession }
            );

            expect(mockCreate).toHaveBeenCalledTimes(1);
            const createArgs = mockCreate.mock.calls[0];
            const movimiento = createArgs[0][0];

            expect(movimiento.tipoMovimiento).toBe('INGRESO');
            expect(movimiento.kilos).toBe(validData.kilos);
            expect(movimiento.canastillas).toBe(validData.canastillas);
            expect(movimiento.user).toBe(mockUserId);
            expect(movimiento.destino).toBe(`INVENTARIO_${validData.area}`);
            expect(movimiento.tipoRegistro).toBe(validData.loteType);
        });

        test('debería pasar la session al crear el movimiento', async () => {
            await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                validData, mockUserId, { session: mockSession }
            );

            const createArgs = mockCreate.mock.calls[0];
            expect(createArgs[1]).toEqual({ session: mockSession });
        });

        test('debería mapear kilos y canastillas a los campos del schema', async () => {
            await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                validData, mockUserId, { session: mockSession }
            );

            // Verificar que el constructor recibió los campos mapeados
            const savedInstance = mockSave.mock.instances[0] || mockSave.mock.contexts[0];
            expect(savedInstance.kilosIniciales).toBe(validData.kilos);
            expect(savedInstance.kilosActuales).toBe(validData.kilos);
            expect(savedInstance.canastillasIniciales).toBe(validData.canastillas);
            expect(savedInstance.canastillasActuales).toBe(validData.canastillas);
            expect(savedInstance.user).toBe(mockUserId);
        });

        test('debería buscar registro existente con los campos correctos', async () => {
            await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                validData, mockUserId, { session: mockSession }
            );

            expect(mockFindOne).toHaveBeenCalledWith({
                lote: validData.lote,
                tipoFruta: validData.tipoFruta,
                area: validData.area,
                tipoDescarte: validData.tipoDescarte,
                loteType: validData.loteType,
                estado: 'ACTIVO'
            });
        });

        test('debería pasar la session a findOne', async () => {
            await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                validData, mockUserId, { session: mockSession }
            );

            expect(mockSessionFn).toHaveBeenCalledWith(mockSession);
        });
    });

    // ============================================================
    // TEST GROUP: Actualizar registro existente
    // ============================================================
    describe('actualizar registro existente', () => {

        const registroExistente = {
            _id: 'existing-descarte-id',
            lote: '507f1f77bcf86cd799439011',
            tipoFruta: '507f1f77bcf86cd799439022',
            area: 'ENCERADO',
            tipoDescarte: '507f1f77bcf86cd799439033',
            kilosIniciales: 200,
            kilosActuales: 200,
            canastillasIniciales: 10,
            canastillasActuales: 10,
            estado: 'ACTIVO'
        };

        beforeEach(() => {
            mockSessionFn.mockResolvedValue(registroExistente);
        });

        test('debería actualizar con $inc los kilos y canastillas', async () => {
            await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                validData, mockUserId, { session: mockSession }
            );

            expect(mockUpdateOne).toHaveBeenCalledWith(
                { _id: registroExistente._id },
                {
                    $inc: {
                        kilosActuales: validData.kilos,
                        kilosIniciales: validData.kilos,
                        canastillasActuales: validData.canastillas,
                        canastillasIniciales: validData.canastillas
                    },
                    $set: { fechaActualizacion: expect.any(Date) }
                },
                { session: mockSession }
            );
        });

        test('debería crear movimiento de INGRESO adicional', async () => {
            await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                validData, mockUserId, { session: mockSession }
            );

            expect(mockCreate).toHaveBeenCalledTimes(1);
            const movimiento = mockCreate.mock.calls[0][0][0];

            expect(movimiento.registroDescarte).toBe(registroExistente._id);
            expect(movimiento.tipoMovimiento).toBe('INGRESO');
            expect(movimiento.kilos).toBe(validData.kilos);
            expect(movimiento.canastillas).toBe(validData.canastillas);
            expect(movimiento.user).toBe(mockUserId);
        });

        test('debería retornar el registro existente', async () => {
            const result = await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                validData, mockUserId, { session: mockSession }
            );

            expect(result).toEqual(registroExistente);
        });

        test('NO debería llamar a save cuando actualiza registro existente', async () => {
            await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                validData, mockUserId, { session: mockSession }
            );

            expect(mockSave).not.toHaveBeenCalled();
        });

        test('NO debería crear un nuevo documento cuando actualiza', async () => {
            const spy = jest.spyOn(MockInventarioActualDescarte.prototype, 'constructor');

            await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                validData, mockUserId, { session: mockSession }
            );

            // updateOne sí debería llamarse, save no
            expect(mockUpdateOne).toHaveBeenCalledTimes(1);
            expect(mockSave).not.toHaveBeenCalled();

            spy.mockRestore();
        });
    });

    // ============================================================
    // TEST GROUP: Manejo de errores de BD
    // ============================================================
    describe('manejo de errores', () => {

        test('debería envolver errores de findOne en PostError con status 409', async () => {
            mockSessionFn.mockRejectedValue(new Error('DB connection lost'));

            try {
                await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                    validData, mockUserId, { session: mockSession }
                );
                expect(true).toBe(false); // No debería llegar aquí
            } catch (err) {
                expect(err).toBeInstanceOf(PostError);
                expect(err.status).toBe(409);
                expect(err.message).toContain('Error agregando inventario descarte');
                expect(err.message).toContain('DB connection lost');
            }
        });

        test('debería envolver errores de save en PostError', async () => {
            mockSave.mockRejectedValue(new Error('Validation failed'));

            await expect(
                InventariosHistorialRepository.add_elemento_inventarioDescartes(validData, mockUserId, { session: mockSession })
            ).rejects.toThrow(PostError);
        });

        test('debería envolver errores de updateOne en PostError', async () => {
            mockSessionFn.mockResolvedValue({ _id: 'existing-id' });
            mockUpdateOne.mockRejectedValue(new Error('Write conflict'));

            await expect(
                InventariosHistorialRepository.add_elemento_inventarioDescartes(validData, mockUserId, { session: mockSession })
            ).rejects.toThrow(PostError);
        });

        test('debería envolver errores de create movimiento en PostError', async () => {
            mockCreate.mockRejectedValue(new Error('Movimiento validation failed'));

            await expect(
                InventariosHistorialRepository.add_elemento_inventarioDescartes(validData, mockUserId, { session: mockSession })
            ).rejects.toThrow(PostError);
        });
    });

    // ============================================================
    // TEST GROUP: Manejo de session/opts
    // ============================================================
    describe('manejo de session', () => {

        test('debería funcionar sin opts (usa default {})', async () => {
            mockSessionFn.mockResolvedValue(null);

            const result = await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                validData, mockUserId
            );

            expect(result).toBeDefined();
            expect(mockSessionFn).toHaveBeenCalledWith(undefined);
        });

        test('debería funcionar con opts vacío', async () => {
            mockSessionFn.mockResolvedValue(null);

            const result = await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                validData, mockUserId, {}
            );

            expect(result).toBeDefined();
            expect(mockSessionFn).toHaveBeenCalledWith(undefined);
        });
    });

    // ============================================================
    // TEST GROUP: Contrato de API
    // ============================================================
    describe('contrato de API', () => {

        test('debería retornar el documento guardado en caso nuevo', async () => {
            const result = await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                validData, mockUserId, { session: mockSession }
            );

            expect(result._id).toBe('new-descarte-id');
        });

        test('debería retornar el registro existente en caso de actualización', async () => {
            const existente = { _id: 'existing-id', kilosIniciales: 100 };
            mockSessionFn.mockResolvedValue(existente);

            const result = await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                validData, mockUserId, { session: mockSession }
            );

            expect(result).toEqual(existente);
        });

        test('errores de validación deberían tener status 409', async () => {
            try {
                await InventariosHistorialRepository.add_elemento_inventarioDescartes(
                    {}, mockUserId, { session: mockSession }
                );
                expect(true).toBe(false);
            } catch (err) {
                expect(err.status).toBe(409);
            }
        });
    });
});
