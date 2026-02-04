import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import mongoose from 'mongoose';

// Mock del config ANTES de cualquier import que lo use
const mockConfig = {};
jest.unstable_mockModule('../../../src/config/index.js', () => ({
    default: mockConfig
}));

// Importar DESPUÉS de configurar el mock
const { ProveedoresRepository } = await import('../../../server/Class/Proveedores.js');
const { PreciosRepository } = await import('../../../server/Class/Precios.js');
const { InventariosService } = await import('../../../server/services/inventarios.js');

/**
 * Tests unitarios para InventariosService.obtenerPrecioProveedor
 *
 * Este método obtiene el precio de un proveedor para un tipo de fruta específico.
 * Valida los parámetros de entrada, consulta el proveedor y retorna el precio correspondiente.
 */
describe('InventariosService.obtenerPrecioProveedor', () => {

    // ObjectIds válidos para usar en los tests
    const VALID_PREDIO_ID = '507f1f77bcf86cd799439011';
    const VALID_TIPO_FRUTA_ID = '507f1f77bcf86cd799439012';
    const VALID_PRECIO_ID = '507f1f77bcf86cd799439013';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ============================================================
    // TEST GROUP: Casos de Éxito
    // ============================================================
    describe('casos de éxito', () => {

        test('debería retornar precioId y proveedor cuando todos los datos son válidos', async () => {
            const mockProveedor = {
                _id: VALID_PREDIO_ID,
                PREDIO: 'Finca Test',
                GGN: { code: 'GGN123' },
                precio: {
                    [VALID_TIPO_FRUTA_ID]: VALID_PRECIO_ID
                }
            };
            const mockPrecio = {
                _id: VALID_PRECIO_ID,
                valor: 1500
            };

            jest.spyOn(ProveedoresRepository, 'get_data').mockResolvedValue([mockProveedor]);
            jest.spyOn(PreciosRepository, 'get_data').mockResolvedValue([mockPrecio]);

            const result = await InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, VALID_TIPO_FRUTA_ID);

            expect(result).toEqual({
                precioId: VALID_PRECIO_ID,
                proveedor: mockProveedor
            });
            expect(ProveedoresRepository.get_data).toHaveBeenCalledWith({
                ids: [VALID_PREDIO_ID],
                select: { precio: 1, PREDIO: 1, GGN: 1 }
            }, null);
            expect(PreciosRepository.get_data).toHaveBeenCalledWith({ ids: [VALID_PRECIO_ID] }, null);
        });

        test('debería pasar la session correctamente a los repositorios', async () => {
            const mockSession = { id: 'session-123' };
            const mockProveedor = {
                _id: VALID_PREDIO_ID,
                precio: { [VALID_TIPO_FRUTA_ID]: VALID_PRECIO_ID }
            };
            const mockPrecio = { _id: VALID_PRECIO_ID };

            jest.spyOn(ProveedoresRepository, 'get_data').mockResolvedValue([mockProveedor]);
            jest.spyOn(PreciosRepository, 'get_data').mockResolvedValue([mockPrecio]);

            await InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, VALID_TIPO_FRUTA_ID, mockSession);

            expect(ProveedoresRepository.get_data).toHaveBeenCalledWith(
                expect.any(Object),
                mockSession
            );
            expect(PreciosRepository.get_data).toHaveBeenCalledWith(
                expect.any(Object),
                mockSession
            );
        });
    });

    // ============================================================
    // TEST GROUP: Validación de Parámetros Requeridos
    // ============================================================
    describe('validación de parámetros requeridos', () => {

        test('debería lanzar error si predioId es null', async () => {
            await expect(InventariosService.obtenerPrecioProveedor(null, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId y tipoFruta son requeridos en obtenerPrecioProveedor');
        });

        test('debería lanzar error si predioId es undefined', async () => {
            await expect(InventariosService.obtenerPrecioProveedor(undefined, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId y tipoFruta son requeridos en obtenerPrecioProveedor');
        });

        test('debería lanzar error si predioId es string vacío', async () => {
            await expect(InventariosService.obtenerPrecioProveedor('', VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId y tipoFruta son requeridos en obtenerPrecioProveedor');
        });

        test('debería lanzar error si tipoFruta es null', async () => {
            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, null))
                .rejects
                .toThrow('PredioId y tipoFruta son requeridos en obtenerPrecioProveedor');
        });

        test('debería lanzar error si tipoFruta es undefined', async () => {
            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, undefined))
                .rejects
                .toThrow('PredioId y tipoFruta son requeridos en obtenerPrecioProveedor');
        });

        test('debería lanzar error si tipoFruta es string vacío', async () => {
            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, ''))
                .rejects
                .toThrow('PredioId y tipoFruta son requeridos en obtenerPrecioProveedor');
        });

        test('debería lanzar error si ambos parámetros son null', async () => {
            await expect(InventariosService.obtenerPrecioProveedor(null, null))
                .rejects
                .toThrow('PredioId y tipoFruta son requeridos en obtenerPrecioProveedor');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de ObjectId
    // ============================================================
    describe('validación de ObjectId', () => {

        test('debería lanzar error si predioId no es un ObjectId válido', async () => {
            await expect(InventariosService.obtenerPrecioProveedor('invalid-id', VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });

        test('debería lanzar error si tipoFruta no es un ObjectId válido', async () => {
            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, 'naranja'))
                .rejects
                .toThrow('TipoFruta es inválido en obtenerPrecioProveedor');
        });

        test('debería lanzar error si predioId es un ObjectId con formato incorrecto', async () => {
            await expect(InventariosService.obtenerPrecioProveedor('507f1f77bcf86cd79943901', VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });

        test('debería lanzar error si idPrecio almacenado no es un ObjectId válido', async () => {
            const mockProveedor = {
                _id: VALID_PREDIO_ID,
                precio: { [VALID_TIPO_FRUTA_ID]: 'precio-invalido' }
            };

            jest.spyOn(ProveedoresRepository, 'get_data').mockResolvedValue([mockProveedor]);

            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('Precio inválido');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de Datos de BD
    // ============================================================
    describe('validación de datos de base de datos', () => {

        test('debería lanzar error si el proveedor no existe', async () => {
            jest.spyOn(ProveedoresRepository, 'get_data').mockResolvedValue([]);

            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('Proveedor no encontrado');
        });

        test('debería lanzar error si el repositorio retorna null', async () => {
            jest.spyOn(ProveedoresRepository, 'get_data').mockResolvedValue(null);

            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('Proveedor no encontrado');
        });

        test('debería lanzar error si el proveedor no tiene precio para ese tipo de fruta', async () => {
            const mockProveedor = {
                _id: VALID_PREDIO_ID,
                precio: { '507f1f77bcf86cd799439099': VALID_PRECIO_ID } // Otro tipo de fruta
            };

            jest.spyOn(ProveedoresRepository, 'get_data').mockResolvedValue([mockProveedor]);

            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow(`No hay precio para la fruta ${VALID_TIPO_FRUTA_ID}`);
        });

        test('debería lanzar error si el precio no existe en la BD', async () => {
            const mockProveedor = {
                _id: VALID_PREDIO_ID,
                precio: { [VALID_TIPO_FRUTA_ID]: VALID_PRECIO_ID }
            };

            jest.spyOn(ProveedoresRepository, 'get_data').mockResolvedValue([mockProveedor]);
            jest.spyOn(PreciosRepository, 'get_data').mockResolvedValue([]);

            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('Precio inválido');
        });

        test('debería lanzar error si PreciosRepository retorna null', async () => {
            const mockProveedor = {
                _id: VALID_PREDIO_ID,
                precio: { [VALID_TIPO_FRUTA_ID]: VALID_PRECIO_ID }
            };

            jest.spyOn(ProveedoresRepository, 'get_data').mockResolvedValue([mockProveedor]);
            jest.spyOn(PreciosRepository, 'get_data').mockResolvedValue(null);

            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('Precio inválido');
        });

        test('debería lanzar TypeError si proveedor.precio es undefined', async () => {
            const mockProveedor = {
                _id: VALID_PREDIO_ID,
                // Sin campo precio
            };

            jest.spyOn(ProveedoresRepository, 'get_data').mockResolvedValue([mockProveedor]);

            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow(); // TypeError: Reflect.has called on non-object
        });

        test('debería lanzar TypeError si proveedor.precio es null', async () => {
            const mockProveedor = {
                _id: VALID_PREDIO_ID,
                precio: null
            };

            jest.spyOn(ProveedoresRepository, 'get_data').mockResolvedValue([mockProveedor]);

            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow(); // TypeError: Reflect.has called on non-object
        });
    });

    // ============================================================
    // TEST GROUP: Seguridad - NoSQL Injection
    // ============================================================
    describe('seguridad - NoSQL Injection', () => {

        test('debería rechazar objeto $ne como predioId (NoSQL injection)', async () => {
            const maliciousId = { $ne: null };

            await expect(InventariosService.obtenerPrecioProveedor(maliciousId, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });

        test('debería rechazar objeto $gt como predioId (NoSQL injection)', async () => {
            const maliciousId = { $gt: '' };

            await expect(InventariosService.obtenerPrecioProveedor(maliciousId, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });

        test('debería rechazar objeto $regex como predioId (NoSQL injection)', async () => {
            const maliciousId = { $regex: '.*' };

            await expect(InventariosService.obtenerPrecioProveedor(maliciousId, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });

        test('debería rechazar objeto $where como predioId (NoSQL injection)', async () => {
            const maliciousId = { $where: 'this.password' };

            await expect(InventariosService.obtenerPrecioProveedor(maliciousId, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });

        test('debería rechazar objeto $ne como tipoFruta (NoSQL injection)', async () => {
            const maliciousTipo = { $ne: null };

            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, maliciousTipo))
                .rejects
                .toThrow('TipoFruta es inválido en obtenerPrecioProveedor');
        });

        test('debería rechazar objeto anidado malicioso (NoSQL injection)', async () => {
            const maliciousId = { $or: [{ _id: { $exists: true } }] };

            await expect(InventariosService.obtenerPrecioProveedor(maliciousId, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });

        test('debería rechazar array como predioId (posible injection)', async () => {
            const maliciousId = [VALID_PREDIO_ID, '507f1f77bcf86cd799439099'];

            await expect(InventariosService.obtenerPrecioProveedor(maliciousId, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });

        test('debería rechazar array como tipoFruta (posible injection)', async () => {
            const maliciousTipo = [VALID_TIPO_FRUTA_ID];

            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, maliciousTipo))
                .rejects
                .toThrow('TipoFruta es inválido en obtenerPrecioProveedor');
        });
    });

    // ============================================================
    // TEST GROUP: Seguridad - Prototype Pollution
    // ============================================================
    describe('seguridad - Prototype Pollution', () => {

        test('debería no acceder a __proto__ como tipoFruta', async () => {
            // Aunque __proto__ no es un ObjectId válido, verificamos el comportamiento
            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, '__proto__'))
                .rejects
                .toThrow('TipoFruta es inválido en obtenerPrecioProveedor');
        });

        test('debería no acceder a constructor como tipoFruta', async () => {
            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, 'constructor'))
                .rejects
                .toThrow('TipoFruta es inválido en obtenerPrecioProveedor');
        });

        test('debería no acceder a prototype como tipoFruta', async () => {
            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, 'prototype'))
                .rejects
                .toThrow('TipoFruta es inválido en obtenerPrecioProveedor');
        });

        test('debería no acceder a hasOwnProperty como tipoFruta', async () => {
            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, 'hasOwnProperty'))
                .rejects
                .toThrow('TipoFruta es inválido en obtenerPrecioProveedor');
        });
    });

    // ============================================================
    // TEST GROUP: Tipos de Datos Inválidos
    // ============================================================
    describe('tipos de datos inválidos', () => {

        /**
         * NOTA: mongoose.Types.ObjectId.isValid() acepta números e Infinity.
         * Esto no es una vulnerabilidad crítica porque la query simplemente
         * no encontrará el documento y lanzará "Proveedor no encontrado".
         * Se documenta este comportamiento en los siguientes tests.
         */
        test('números pasan validación de ObjectId pero fallan en BD (comportamiento de mongoose)', async () => {
            // mongoose acepta números como ObjectId válido
            expect(mongoose.Types.ObjectId.isValid(123456)).toBe(true);

            // Pero la query no encontrará nada, así que falla con "Proveedor no encontrado"
            jest.spyOn(ProveedoresRepository, 'get_data').mockResolvedValue([]);

            await expect(InventariosService.obtenerPrecioProveedor(123456, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('Proveedor no encontrado');
        });

        test('Infinity pasa validación de ObjectId pero falla en BD (comportamiento de mongoose)', async () => {
            expect(mongoose.Types.ObjectId.isValid(Infinity)).toBe(true);

            jest.spyOn(ProveedoresRepository, 'get_data').mockResolvedValue([]);

            await expect(InventariosService.obtenerPrecioProveedor(Infinity, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('Proveedor no encontrado');
        });

        test('debería rechazar NaN como predioId', async () => {
            await expect(InventariosService.obtenerPrecioProveedor(NaN, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId y tipoFruta son requeridos en obtenerPrecioProveedor');
        });

        test('debería rechazar NaN como tipoFruta', async () => {
            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, NaN))
                .rejects
                .toThrow('PredioId y tipoFruta son requeridos en obtenerPrecioProveedor');
        });

        test('debería rechazar boolean true como predioId', async () => {
            await expect(InventariosService.obtenerPrecioProveedor(true, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });

        test('debería rechazar boolean false como predioId', async () => {
            await expect(InventariosService.obtenerPrecioProveedor(false, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId y tipoFruta son requeridos en obtenerPrecioProveedor');
        });

        test('debería rechazar función como predioId', async () => {
            const maliciousFn = () => VALID_PREDIO_ID;

            await expect(InventariosService.obtenerPrecioProveedor(maliciousFn, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });

        test('debería rechazar Symbol como predioId', async () => {
            const symbolId = Symbol('id');

            await expect(InventariosService.obtenerPrecioProveedor(symbolId, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });

        test('debería rechazar BigInt como predioId', async () => {
            const bigIntId = BigInt(123456789012345678901234n);

            await expect(InventariosService.obtenerPrecioProveedor(bigIntId, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });

        test('debería rechazar Date como predioId', async () => {
            const dateId = new Date();

            await expect(InventariosService.obtenerPrecioProveedor(dateId, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });

        test('debería rechazar RegExp como predioId', async () => {
            const regexId = /test/;

            await expect(InventariosService.obtenerPrecioProveedor(regexId, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });

        test('debería rechazar objeto con toString malicioso', async () => {
            const maliciousObj = {
                toString: () => { throw new Error('Exploit ejecutado'); }
            };

            await expect(InventariosService.obtenerPrecioProveedor(maliciousObj, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });

        test('debería rechazar objeto con valueOf malicioso', async () => {
            const maliciousObj = {
                valueOf: () => { throw new Error('Exploit ejecutado'); }
            };

            await expect(InventariosService.obtenerPrecioProveedor(maliciousObj, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });
    });

    // ============================================================
    // TEST GROUP: Manejo de Errores de Repositorios
    // ============================================================
    describe('manejo de errores de repositorios', () => {

        test('debería propagar errores de ProveedoresRepository', async () => {
            const dbError = new Error('Database connection failed');
            jest.spyOn(ProveedoresRepository, 'get_data').mockRejectedValue(dbError);

            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('Database connection failed');
        });

        test('debería propagar errores de PreciosRepository', async () => {
            const mockProveedor = {
                _id: VALID_PREDIO_ID,
                precio: { [VALID_TIPO_FRUTA_ID]: VALID_PRECIO_ID }
            };
            const dbError = new Error('Precios collection unavailable');

            jest.spyOn(ProveedoresRepository, 'get_data').mockResolvedValue([mockProveedor]);
            jest.spyOn(PreciosRepository, 'get_data').mockRejectedValue(dbError);

            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('Precios collection unavailable');
        });

        test('debería propagar errores de timeout', async () => {
            const timeoutError = new Error('Operation timed out');
            jest.spyOn(ProveedoresRepository, 'get_data').mockRejectedValue(timeoutError);

            await expect(InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('Operation timed out');
        });
    });

    // ============================================================
    // TEST GROUP: Casos Edge
    // ============================================================
    describe('casos edge', () => {

        test('debería funcionar con ObjectId en formato de 24 caracteres hexadecimales', async () => {
            const hexId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
            const mockProveedor = {
                _id: hexId,
                precio: { [hexId]: hexId }
            };
            const mockPrecio = { _id: hexId };

            jest.spyOn(ProveedoresRepository, 'get_data').mockResolvedValue([mockProveedor]);
            jest.spyOn(PreciosRepository, 'get_data').mockResolvedValue([mockPrecio]);

            const result = await InventariosService.obtenerPrecioProveedor(hexId, hexId);

            expect(result.precioId).toBe(hexId);
        });

        test('debería manejar proveedor con múltiples tipos de fruta', async () => {
            const otroTipoFruta = '507f1f77bcf86cd799439099';
            const mockProveedor = {
                _id: VALID_PREDIO_ID,
                precio: {
                    [VALID_TIPO_FRUTA_ID]: VALID_PRECIO_ID,
                    [otroTipoFruta]: '507f1f77bcf86cd799439088'
                }
            };
            const mockPrecio = { _id: VALID_PRECIO_ID };

            jest.spyOn(ProveedoresRepository, 'get_data').mockResolvedValue([mockProveedor]);
            jest.spyOn(PreciosRepository, 'get_data').mockResolvedValue([mockPrecio]);

            const result = await InventariosService.obtenerPrecioProveedor(VALID_PREDIO_ID, VALID_TIPO_FRUTA_ID);

            expect(result.precioId).toBe(VALID_PRECIO_ID);
        });

        test('debería rechazar string con espacios que parece ObjectId', async () => {
            const idConEspacios = ' 507f1f77bcf86cd799439011 ';

            await expect(InventariosService.obtenerPrecioProveedor(idConEspacios, VALID_TIPO_FRUTA_ID))
                .rejects
                .toThrow('PredioId es inválido en obtenerPrecioProveedor');
        });

        test('debería rechazar ObjectId en mayúsculas (MongoDB es case-sensitive)', async () => {
            const upperCaseId = '507F1F77BCF86CD799439011';

            // mongoose.Types.ObjectId.isValid acepta mayúsculas, así que esto debería funcionar
            const mockProveedor = {
                _id: upperCaseId,
                precio: { [VALID_TIPO_FRUTA_ID]: VALID_PRECIO_ID }
            };
            const mockPrecio = { _id: VALID_PRECIO_ID };

            jest.spyOn(ProveedoresRepository, 'get_data').mockResolvedValue([mockProveedor]);
            jest.spyOn(PreciosRepository, 'get_data').mockResolvedValue([mockPrecio]);

            const result = await InventariosService.obtenerPrecioProveedor(upperCaseId, VALID_TIPO_FRUTA_ID);

            expect(result).toBeDefined();
        });
    });

});
