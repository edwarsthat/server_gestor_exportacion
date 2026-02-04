import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { BaseRepository } from '../../../server/Class/base/BaseRepository.js';
import { BadGetwayError, ConnectionDBError, PostError } from '../../../Error/ConnectionErrors.js';

/**
 * Tests unitarios para BaseRepository
 *
 * BaseRepository es la clase base para todos los repositorios que interactuan
 * con MongoDB. Proporciona metodos CRUD genericos que las clases hijas heredan.
 */
describe('BaseRepository', () => {

    // ============================================================
    // SETUP: Mock del modelo de Mongoose
    // ============================================================
    let mockModel;
    let mockQuery;
    let TestRepository;

    beforeEach(() => {
        // Resetear mocks antes de cada test
        jest.clearAllMocks();

        // Mock de la cadena de metodos de Mongoose (find().select().limit()...)
        mockQuery = {
            select: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            session: jest.fn().mockReturnThis(),
            exec: jest.fn()
        };

        // Mock del modelo de Mongoose
        mockModel = {
            find: jest.fn().mockReturnValue(mockQuery),
            countDocuments: jest.fn(),
            findOneAndUpdate: jest.fn()
        };

        // Clase de prueba que extiende BaseRepository
        TestRepository = class extends BaseRepository {
            static model = mockModel;
            static modelName = 'TestModel';
        };
    });

    // ============================================================
    // TEST GROUP: get_data
    // ============================================================
    describe('get_data', () => {

        // ------------------------------------------------------------
        // Casos exitosos
        // ------------------------------------------------------------
        describe('casos exitosos', () => {

            test('deberia retornar documentos con opciones por defecto', async () => {
                const mockDocs = [{ _id: '1', nombre: 'Test' }];
                mockQuery.exec.mockResolvedValue(mockDocs);

                const result = await TestRepository.get_data();

                expect(mockModel.find).toHaveBeenCalledWith({});
                expect(mockQuery.select).toHaveBeenCalledWith({});
                expect(mockQuery.limit).not.toHaveBeenCalled();
                expect(mockQuery.skip).toHaveBeenCalledWith(0);
                expect(mockQuery.populate).toHaveBeenCalledWith([]);
                expect(mockQuery.session).toHaveBeenCalledWith(null);
                expect(result).toEqual(mockDocs);
            });

            test('deberia aplicar filtro por ids cuando se proporcionan', async () => {
                const mockDocs = [{ _id: '1' }, { _id: '2' }];
                mockQuery.exec.mockResolvedValue(mockDocs);
                const ids = ['1', '2'];

                await TestRepository.get_data({ ids });

                expect(mockModel.find).toHaveBeenCalledWith({ _id: { $in: ids } });
            });

            test('deberia combinar ids con query existente', async () => {
                const mockDocs = [{ _id: '1', activo: true }];
                mockQuery.exec.mockResolvedValue(mockDocs);
                const ids = ['1'];
                const query = { activo: true };

                await TestRepository.get_data({ ids, query });

                expect(mockModel.find).toHaveBeenCalledWith({
                    activo: true,
                    _id: { $in: ids }
                });
            });

            test('deberia aplicar select correctamente', async () => {
                mockQuery.exec.mockResolvedValue([]);
                const select = { nombre: 1, email: 1 };

                await TestRepository.get_data({ select });

                expect(mockQuery.select).toHaveBeenCalledWith(select);
            });

            test('deberia aplicar limit y skip para paginacion', async () => {
                mockQuery.exec.mockResolvedValue([]);

                await TestRepository.get_data({ limit: 10, skip: 20 });

                expect(mockQuery.limit).toHaveBeenCalledWith(10);
                expect(mockQuery.skip).toHaveBeenCalledWith(20);
            });

            test('deberia aplicar populate correctamente', async () => {
                mockQuery.exec.mockResolvedValue([]);
                const populate = [{ path: 'usuario', select: 'nombre' }];

                await TestRepository.get_data({ populate });

                expect(mockQuery.populate).toHaveBeenCalledWith(populate);
            });

            test('deberia usar session cuando se proporciona', async () => {
                mockQuery.exec.mockResolvedValue([]);
                const mockSession = { id: 'session-123' };

                await TestRepository.get_data({}, { session: mockSession });

                expect(mockQuery.session).toHaveBeenCalledWith(mockSession);
            });

            test('deberia aplicar todas las opciones juntas', async () => {
                const mockDocs = [{ _id: '1' }];
                mockQuery.exec.mockResolvedValue(mockDocs);
                const options = {
                    ids: ['1', '2'],
                    query: { status: 'activo' },
                    select: { nombre: 1 },
                    limit: 5,
                    skip: 10,
                    populate: ['usuario']
                };
                const mockSession = { id: 'session' };

                const result = await TestRepository.get_data(options, { session: mockSession });

                expect(mockModel.find).toHaveBeenCalledWith({
                    status: 'activo',
                    _id: { $in: ['1', '2'] }
                });
                expect(mockQuery.select).toHaveBeenCalledWith({ nombre: 1 });
                expect(mockQuery.limit).toHaveBeenCalledWith(5);
                expect(mockQuery.skip).toHaveBeenCalledWith(10);
                expect(mockQuery.populate).toHaveBeenCalledWith(['usuario']);
                expect(mockQuery.session).toHaveBeenCalledWith(mockSession);
                expect(result).toEqual(mockDocs);
            });
        });

        // ------------------------------------------------------------
        // Casos de error
        // ------------------------------------------------------------
        describe('casos de error', () => {

            test('deberia lanzar BadGetwayError cuando falla la consulta', async () => {
                mockQuery.exec.mockRejectedValue(new Error('Connection timeout'));

                await expect(TestRepository.get_data())
                    .rejects
                    .toThrow(BadGetwayError);
            });

            test('deberia incluir nombre del modelo en mensaje de error', async () => {
                mockQuery.exec.mockRejectedValue(new Error('DB Error'));

                await expect(TestRepository.get_data())
                    .rejects
                    .toThrow('Error en TestModel');
            });

            test('deberia incluir mensaje de error original', async () => {
                mockQuery.exec.mockRejectedValue(new Error('Specific error message'));

                await expect(TestRepository.get_data())
                    .rejects
                    .toThrow('Specific error message');
            });

            test('deberia tener status 502 en el error', async () => {
                mockQuery.exec.mockRejectedValue(new Error('Error'));

                try {
                    await TestRepository.get_data();
                } catch (error) {
                    expect(error.status).toBe(502);
                }
            });
        });
    });

    // ============================================================
    // TEST GROUP: get_numero_registros
    // ============================================================
    describe('get_numero_registros', () => {

        // ------------------------------------------------------------
        // Casos exitosos
        // ------------------------------------------------------------
        describe('casos exitosos', () => {

            test('deberia retornar el numero de documentos', async () => {
                mockModel.countDocuments.mockResolvedValue(42);

                const result = await TestRepository.get_numero_registros({});

                expect(result).toBe(42);
            });

            test('deberia pasar el filtro a countDocuments', async () => {
                mockModel.countDocuments.mockResolvedValue(10);
                const filter = { activo: true, tipo: 'admin' };

                await TestRepository.get_numero_registros(filter);

                expect(mockModel.countDocuments).toHaveBeenCalledWith(filter);
            });

            test('deberia retornar 0 cuando no hay documentos', async () => {
                mockModel.countDocuments.mockResolvedValue(0);

                const result = await TestRepository.get_numero_registros({});

                expect(result).toBe(0);
            });
        });

        // ------------------------------------------------------------
        // Casos de error
        // ------------------------------------------------------------
        describe('casos de error', () => {

            test('deberia lanzar BadGetwayError cuando falla', async () => {
                mockModel.countDocuments.mockRejectedValue(new Error('Count failed'));

                await expect(TestRepository.get_numero_registros({}))
                    .rejects
                    .toThrow(BadGetwayError);
            });

            test('deberia incluir nombre del modelo en mensaje de error', async () => {
                mockModel.countDocuments.mockRejectedValue(new Error('Error'));

                await expect(TestRepository.get_numero_registros({}))
                    .rejects
                    .toThrow('TestModel');
            });

            test('deberia tener status 501 en el error', async () => {
                mockModel.countDocuments.mockRejectedValue(new Error('Error'));

                try {
                    await TestRepository.get_numero_registros({});
                } catch (error) {
                    expect(error.status).toBe(501);
                }
            });
        });
    });

    // ============================================================
    // TEST GROUP: post_data
    // ============================================================
    describe('post_data', () => {

        let mockInstance;

        beforeEach(() => {
            // Mock de una instancia del modelo
            mockInstance = {
                _user: null,
                save: jest.fn()
            };

            // Mock del constructor del modelo
            mockModel.mockImplementation = null;
            TestRepository.model = jest.fn().mockImplementation(() => mockInstance);
        });

        // ------------------------------------------------------------
        // Casos exitosos
        // ------------------------------------------------------------
        describe('casos exitosos', () => {

            test('deberia crear y guardar un nuevo documento', async () => {
                const savedDoc = { _id: '123', nombre: 'Test' };
                mockInstance.save.mockResolvedValue(savedDoc);
                const data = { nombre: 'Test' };

                const result = await TestRepository.post_data(data);

                expect(TestRepository.model).toHaveBeenCalledWith(data);
                expect(mockInstance.save).toHaveBeenCalled();
                expect(result).toEqual(savedDoc);
            });

            test('deberia asignar el usuario cuando se proporciona', async () => {
                mockInstance.save.mockResolvedValue({});
                const data = { nombre: 'Test' };
                const user = 'usuario123';

                await TestRepository.post_data(data, { user });

                expect(mockInstance._user).toBe(user);
            });

            test('deberia usar session cuando se proporciona', async () => {
                mockInstance.save.mockResolvedValue({});
                const mockSession = { id: 'session-123' };

                await TestRepository.post_data({}, { session: mockSession });

                expect(mockInstance.save).toHaveBeenCalledWith({ session: mockSession });
            });

            test('deberia usar valores por defecto cuando no se pasan opciones', async () => {
                mockInstance.save.mockResolvedValue({});

                await TestRepository.post_data({});

                expect(mockInstance._user).toBe('');
                expect(mockInstance.save).toHaveBeenCalledWith({ session: null });
            });
        });

        // ------------------------------------------------------------
        // Casos de error
        // ------------------------------------------------------------
        describe('casos de error', () => {

            test('deberia lanzar PostError cuando falla el guardado', async () => {
                mockInstance.save.mockRejectedValue(new Error('Validation failed'));

                await expect(TestRepository.post_data({}))
                    .rejects
                    .toThrow(PostError);
            });

            test('deberia incluir nombre del modelo en mensaje de error', async () => {
                mockInstance.save.mockRejectedValue(new Error('Error'));

                await expect(TestRepository.post_data({}))
                    .rejects
                    .toThrow('TestModel');
            });

            test('deberia tener status 409 en el error', async () => {
                mockInstance.save.mockRejectedValue(new Error('Error'));

                try {
                    await TestRepository.post_data({});
                } catch (error) {
                    expect(error.status).toBe(409);
                }
            });

            test('deberia incluir mensaje de error original', async () => {
                mockInstance.save.mockRejectedValue(new Error('Duplicate key'));

                await expect(TestRepository.post_data({}))
                    .rejects
                    .toThrow('Duplicate key');
            });
        });
    });

    // ============================================================
    // TEST GROUP: actualizar_data
    // ============================================================
    describe('actualizar_data', () => {

        beforeEach(() => {
            // Restaurar el mock original del modelo
            TestRepository.model = mockModel;
        });

        // ------------------------------------------------------------
        // Casos exitosos
        // ------------------------------------------------------------
        describe('casos exitosos', () => {

            test('deberia actualizar y retornar el documento', async () => {
                const updatedDoc = { _id: '1', nombre: 'Actualizado' };
                mockModel.findOneAndUpdate.mockResolvedValue(updatedDoc);
                const filter = { _id: '1' };
                const update = { $set: { nombre: 'Actualizado' } };

                const result = await TestRepository.actualizar_data(filter, update);

                expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
                    filter,
                    update,
                    expect.objectContaining({ new: true })
                );
                expect(result).toEqual(updatedDoc);
            });

            test('deberia incluir session en las opciones cuando se proporciona', async () => {
                mockModel.findOneAndUpdate.mockResolvedValue({ _id: '1' });
                const mockSession = { id: 'session-123' };

                await TestRepository.actualizar_data({}, {}, { session: mockSession });

                expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
                    {},
                    {},
                    expect.objectContaining({ session: mockSession })
                );
            });

            test('deberia incluir arrayFilters cuando se proporcionan', async () => {
                mockModel.findOneAndUpdate.mockResolvedValue({ _id: '1' });
                const arrayFilters = [{ 'elem.status': 'pending' }];

                await TestRepository.actualizar_data({}, {}, { arrayFilters });

                expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
                    {},
                    {},
                    expect.objectContaining({ arrayFilters })
                );
            });

            test('deberia pasar opciones adicionales', async () => {
                mockModel.findOneAndUpdate.mockResolvedValue({ _id: '1' });

                await TestRepository.actualizar_data({}, {}, {
                    upsert: true,
                    runValidators: true
                });

                expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
                    {},
                    {},
                    expect.objectContaining({
                        upsert: true,
                        runValidators: true
                    })
                );
            });

            test('deberia combinar todas las opciones correctamente', async () => {
                mockModel.findOneAndUpdate.mockResolvedValue({ _id: '1' });
                const mockSession = { id: 'session' };
                const arrayFilters = [{ 'i.x': 1 }];

                await TestRepository.actualizar_data(
                    { _id: '1' },
                    { $set: { valor: 100 } },
                    { session: mockSession, arrayFilters, upsert: false }
                );

                expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
                    { _id: '1' },
                    { $set: { valor: 100 } },
                    {
                        new: true,
                        upsert: false,
                        session: mockSession,
                        arrayFilters
                    }
                );
            });
        });

        // ------------------------------------------------------------
        // Casos de error: Documento no encontrado
        // ------------------------------------------------------------
        describe('cuando el documento no existe', () => {

            test('deberia lanzar ConnectionDBError si no encuentra documento', async () => {
                mockModel.findOneAndUpdate.mockResolvedValue(null);

                await expect(TestRepository.actualizar_data({ _id: 'inexistente' }, {}))
                    .rejects
                    .toThrow(ConnectionDBError);
            });

            test('deberia incluir "no encontrado" en el mensaje', async () => {
                mockModel.findOneAndUpdate.mockResolvedValue(null);

                await expect(TestRepository.actualizar_data({}, {}))
                    .rejects
                    .toThrow('no encontrado');
            });

            test('deberia incluir nombre del modelo en el mensaje', async () => {
                mockModel.findOneAndUpdate.mockResolvedValue(null);

                await expect(TestRepository.actualizar_data({}, {}))
                    .rejects
                    .toThrow('TestModel');
            });
        });

        // ------------------------------------------------------------
        // Casos de error: Fallo de base de datos
        // ------------------------------------------------------------
        describe('cuando falla la base de datos', () => {

            test('deberia lanzar ConnectionDBError cuando falla la actualizacion', async () => {
                mockModel.findOneAndUpdate.mockRejectedValue(new Error('Update failed'));

                await expect(TestRepository.actualizar_data({}, {}))
                    .rejects
                    .toThrow(ConnectionDBError);
            });

            test('deberia tener status 523 en el error', async () => {
                mockModel.findOneAndUpdate.mockRejectedValue(new Error('Error'));

                try {
                    await TestRepository.actualizar_data({}, {});
                } catch (error) {
                    expect(error.status).toBe(523);
                }
            });

            test('deberia incluir mensaje de error original', async () => {
                mockModel.findOneAndUpdate.mockRejectedValue(new Error('Validation error'));

                await expect(TestRepository.actualizar_data({}, {}))
                    .rejects
                    .toThrow('Validation error');
            });
        });
    });

    // ============================================================
    // TEST GROUP: Propiedades estaticas
    // ============================================================
    describe('propiedades estaticas', () => {

        test('deberia tener model null por defecto', () => {
            expect(BaseRepository.model).toBeNull();
        });

        test('deberia tener modelName "Base" por defecto', () => {
            expect(BaseRepository.modelName).toBe('Base');
        });

        test('las clases hijas pueden sobrescribir model y modelName', () => {
            expect(TestRepository.model).toBeDefined();
            expect(TestRepository.modelName).toBe('TestModel');
        });
    });
});
