import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock del config ANTES de cualquier import que lo use
const mockConfig = {};
jest.unstable_mockModule('../../../src/config/index.js', () => ({
    default: mockConfig
}));

// Importar DESPUÉS de configurar el mock
const { InventariosService } = await import('../../../server/services/inventarios.js');

/**
 * Tests unitarios para InventariosService.construirQueryIngresoLote
 *
 * Este método construye el objeto query para ingresar un lote al inventario.
 * Valida los parámetros de entrada y retorna un objeto con las fechas formateadas.
 */
describe('InventariosService.construirQueryIngresoLote', () => {

    // Datos válidos base para reutilizar
    const crearDatosValidos = (opciones = {}) => ({
        fecha_estimada_llegada: new Date(2025, 5, 15), // Junio 15, 2025
        tipoFruta: '507f1f77bcf86cd799439011',
        canastillas: 100,
        kilos: 2000,
        predio: '507f1f77bcf86cd799439022',
        observaciones: 'Test lote',
        ...opciones
    });

    const enfValido = 'EF1-250601';
    const precioIdValido = '507f1f77bcf86cd799439033';
    const userValido = { _id: '507f1f77bcf86cd799439044', Rol: 1 };

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

        test('debería construir query correctamente con datos válidos', () => {
            const datos = crearDatosValidos();

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            expect(result).toMatchObject({
                tipoFruta: datos.tipoFruta,
                precio: precioIdValido,
                enf: enfValido,
                user: userValido._id,
                canastillas: 100,
                kilos: 2000
            });
            expect(result.fecha_salida_patio).toBeInstanceOf(Date);
            expect(result.fecha_ingreso_patio).toBeInstanceOf(Date);
            expect(result.fecha_ingreso_inventario).toBeInstanceOf(Date);
        });

        test('debería convertir fecha string a objeto Date', () => {
            const datos = crearDatosValidos({
                fecha_estimada_llegada: '2025-06-15T12:00:00'
            });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            expect(result.fecha_salida_patio).toBeInstanceOf(Date);
            expect(result.fecha_ingreso_patio).toBeInstanceOf(Date);
            expect(result.fecha_ingreso_inventario).toBeInstanceOf(Date);
        });

        test('debería aceptar fecha como timestamp', () => {
            const timestamp = new Date(2025, 5, 15).getTime();
            const datos = crearDatosValidos({
                fecha_estimada_llegada: timestamp
            });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            expect(result.fecha_salida_patio).toBeInstanceOf(Date);
        });

        test('debería preservar propiedades adicionales de datos', () => {
            const datos = crearDatosValidos({
                propiedadExtra: 'valor extra',
                otraPropiedad: 12345
            });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            expect(result.propiedadExtra).toBe('valor extra');
            expect(result.otraPropiedad).toBe(12345);
        });

        test('debería sobrescribir propiedades de datos con valores calculados', () => {
            const datos = crearDatosValidos({
                enf: 'ENF-INCORRECTO',
                precio: 'PRECIO-INCORRECTO',
                user: 'USER-INCORRECTO'
            });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            // Las propiedades sobrescritas deben tener los valores correctos
            expect(result.enf).toBe(enfValido);
            expect(result.precio).toBe(precioIdValido);
            expect(result.user).toBe(userValido._id);
        });

        test('debería usar las mismas fechas para todos los campos de fecha', () => {
            const datos = crearDatosValidos();

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            expect(result.fecha_salida_patio.getTime())
                .toBe(result.fecha_ingreso_patio.getTime());
            expect(result.fecha_ingreso_patio.getTime())
                .toBe(result.fecha_ingreso_inventario.getTime());
        });
    });

    // ============================================================
    // TEST GROUP: Validación de Parámetros Requeridos
    // ============================================================
    describe('validación de parámetros requeridos', () => {

        test('debería lanzar error si datos es null', () => {
            expect(() => InventariosService.construirQueryIngresoLote(
                null, enfValido, precioIdValido, userValido
            )).toThrow('Datos, enf, precioId y user son requeridos en construirQueryIngresoLote');
        });

        test('debería lanzar error si datos es undefined', () => {
            expect(() => InventariosService.construirQueryIngresoLote(
                undefined, enfValido, precioIdValido, userValido
            )).toThrow('Datos, enf, precioId y user son requeridos en construirQueryIngresoLote');
        });

        test('debería lanzar error si enf es null', () => {
            const datos = crearDatosValidos();

            expect(() => InventariosService.construirQueryIngresoLote(
                datos, null, precioIdValido, userValido
            )).toThrow('Datos, enf, precioId y user son requeridos en construirQueryIngresoLote');
        });

        test('debería lanzar error si enf es undefined', () => {
            const datos = crearDatosValidos();

            expect(() => InventariosService.construirQueryIngresoLote(
                datos, undefined, precioIdValido, userValido
            )).toThrow('Datos, enf, precioId y user son requeridos en construirQueryIngresoLote');
        });

        test('debería lanzar error si enf es string vacío', () => {
            const datos = crearDatosValidos();

            expect(() => InventariosService.construirQueryIngresoLote(
                datos, '', precioIdValido, userValido
            )).toThrow('Datos, enf, precioId y user son requeridos en construirQueryIngresoLote');
        });

        test('debería lanzar error si precioId es null', () => {
            const datos = crearDatosValidos();

            expect(() => InventariosService.construirQueryIngresoLote(
                datos, enfValido, null, userValido
            )).toThrow('Datos, enf, precioId y user son requeridos en construirQueryIngresoLote');
        });

        test('debería lanzar error si user es null', () => {
            const datos = crearDatosValidos();

            expect(() => InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, null
            )).toThrow('Datos, enf, precioId y user son requeridos en construirQueryIngresoLote');
        });

        test('debería lanzar error si user es undefined', () => {
            const datos = crearDatosValidos();

            expect(() => InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, undefined
            )).toThrow('Datos, enf, precioId y user son requeridos en construirQueryIngresoLote');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de fecha_estimada_llegada
    // ============================================================
    describe('validación de fecha_estimada_llegada', () => {

        test('debería lanzar error si fecha_estimada_llegada no existe', () => {
            const datos = { tipoFruta: '123', canastillas: 100 };

            expect(() => InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            )).toThrow('Fecha de llegada es requerida en construirQueryIngresoLote');
        });

        test('debería lanzar error si fecha_estimada_llegada es null', () => {
            const datos = crearDatosValidos({ fecha_estimada_llegada: null });

            expect(() => InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            )).toThrow('Fecha de llegada es requerida en construirQueryIngresoLote');
        });

        test('debería lanzar error si fecha_estimada_llegada es string vacío', () => {
            const datos = crearDatosValidos({ fecha_estimada_llegada: '' });

            expect(() => InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            )).toThrow('Fecha de llegada es requerida en construirQueryIngresoLote');
        });

        test('debería lanzar error si fecha_estimada_llegada es inválida', () => {
            const datos = crearDatosValidos({ fecha_estimada_llegada: 'fecha-invalida' });

            expect(() => InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            )).toThrow('Fecha de llegada inválida en construirQueryIngresoLote');
        });

        test('debería lanzar error si fecha_estimada_llegada es objeto no-fecha', () => {
            const datos = crearDatosValidos({ fecha_estimada_llegada: { año: 2025 } });

            expect(() => InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            )).toThrow('Fecha de llegada inválida en construirQueryIngresoLote');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de user._id
    // ============================================================
    describe('validación de user._id', () => {

        test('debería lanzar error si user no tiene _id', () => {
            const datos = crearDatosValidos();

            expect(() => InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, { Rol: 1 }
            )).toThrow('user._id es requerido en construirQueryIngresoLote');
        });

        test('debería lanzar error si user._id es null', () => {
            const datos = crearDatosValidos();

            expect(() => InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, { _id: null, Rol: 1 }
            )).toThrow('user._id es requerido en construirQueryIngresoLote');
        });

        test('debería lanzar error si user._id es undefined', () => {
            const datos = crearDatosValidos();

            expect(() => InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, { _id: undefined, Rol: 1 }
            )).toThrow('user._id es requerido en construirQueryIngresoLote');
        });

        test('debería lanzar error si user._id es string vacío', () => {
            const datos = crearDatosValidos();

            expect(() => InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, { _id: '', Rol: 1 }
            )).toThrow('user._id es requerido en construirQueryIngresoLote');
        });
    });

    // ============================================================
    // TEST GROUP: Datos Raros y Edge Cases
    // ============================================================
    describe('datos raros y edge cases', () => {

        test('debería manejar datos como objeto vacío (falla por fecha)', () => {
            expect(() => InventariosService.construirQueryIngresoLote(
                {}, enfValido, precioIdValido, userValido
            )).toThrow('Fecha de llegada es requerida en construirQueryIngresoLote');
        });

        test('debería manejar Infinity en campos numéricos (pasa, no se valida)', () => {
            const datos = crearDatosValidos({
                canastillas: Infinity,
                kilos: -Infinity
            });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            // El método no valida estos campos, los pasa tal cual
            expect(result.canastillas).toBe(Infinity);
            expect(result.kilos).toBe(-Infinity);
        });

        test('debería manejar NaN en campos numéricos (pasa, no se valida)', () => {
            const datos = crearDatosValidos({
                canastillas: NaN,
                kilos: NaN
            });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            expect(result.canastillas).toBe(NaN);
            expect(result.kilos).toBe(NaN);
        });

        test('debería manejar valores negativos en campos numéricos', () => {
            const datos = crearDatosValidos({
                canastillas: -100,
                kilos: -2000
            });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            expect(result.canastillas).toBe(-100);
            expect(result.kilos).toBe(-2000);
        });

        test('debería manejar user con propiedades extra', () => {
            const datos = crearDatosValidos();
            const userConExtras = {
                _id: '507f1f77bcf86cd799439044',
                Rol: 1,
                nombre: 'Test User',
                email: 'test@test.com'
            };

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userConExtras
            );

            // Solo debe usar _id
            expect(result.user).toBe(userConExtras._id);
            expect(result.nombre).toBeUndefined();
        });
    });

    // ============================================================
    // TEST GROUP: Seguridad - NoSQL Injection
    // ============================================================
    describe('seguridad - NoSQL Injection', () => {

        test('debería pasar operador $ne en datos (potencial documento corrupto)', () => {
            const datos = crearDatosValidos({
                canastillas: { $ne: null }
            });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            // El método no sanitiza, pasa el objeto tal cual
            // Esto podría crear un documento corrupto en MongoDB
            expect(result.canastillas).toEqual({ $ne: null });
        });

        test('debería pasar operador $gt en datos (potencial documento corrupto)', () => {
            const datos = crearDatosValidos({
                kilos: { $gt: 0 }
            });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            expect(result.kilos).toEqual({ $gt: 0 });
        });

        test('debería pasar operador $where en datos (potencial inyección)', () => {
            const datos = crearDatosValidos({
                malicioso: { $where: 'this.password' }
            });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            expect(result.malicioso).toEqual({ $where: 'this.password' });
        });

        test('debería pasar operador $regex en datos', () => {
            const datos = crearDatosValidos({
                observaciones: { $regex: '.*' }
            });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            expect(result.observaciones).toEqual({ $regex: '.*' });
        });

        test('debería pasar objeto con $set anidado', () => {
            const datos = crearDatosValidos({
                nested: { $set: { admin: true } }
            });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            expect(result.nested).toEqual({ $set: { admin: true } });
        });

        test('debería pasar array con operadores MongoDB', () => {
            const datos = crearDatosValidos({
                items: [{ $elemMatch: { qty: { $gt: 0 } } }]
            });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            expect(result.items).toEqual([{ $elemMatch: { qty: { $gt: 0 } } }]);
        });

        test('debería manejar enf con caracteres especiales', () => {
            const datos = crearDatosValidos();

            const result = InventariosService.construirQueryIngresoLote(
                datos, 'EF1-<script>alert("xss")</script>', precioIdValido, userValido
            );

            expect(result.enf).toBe('EF1-<script>alert("xss")</script>');
        });

        test('debería manejar precioId como objeto (no string)', () => {
            const datos = crearDatosValidos();
            const precioMalicioso = { $ne: null };

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioMalicioso, userValido
            );

            expect(result.precio).toEqual({ $ne: null });
        });
    });

    // ============================================================
    // TEST GROUP: Seguridad - Prototype Pollution
    // ============================================================
    describe('seguridad - Prototype Pollution', () => {

        test('debería manejar __proto__ en datos', () => {
            const datos = crearDatosValidos();
            datos.__proto__ = { isAdmin: true };

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            // __proto__ no debería afectar el resultado
            expect(result.isAdmin).toBeUndefined();
        });

        test('debería manejar constructor en datos', () => {
            const datos = crearDatosValidos({
                constructor: { prototype: { isAdmin: true } }
            });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            // Se pasa tal cual pero no debería afectar prototipos
            expect(result.constructor).toEqual({ prototype: { isAdmin: true } });
        });
    });

    // ============================================================
    // TEST GROUP: Tipos de Datos Inesperados
    // ============================================================
    describe('tipos de datos inesperados', () => {

        test('debería manejar datos como array (pasa validación inicial)', () => {
            const datosArray = [1, 2, 3];
            datosArray.fecha_estimada_llegada = new Date(2025, 5, 15);
            datosArray.tipoFruta = '123';

            const result = InventariosService.construirQueryIngresoLote(
                datosArray, enfValido, precioIdValido, userValido
            );

            // Arrays son objetos, así que pasan pero el resultado es extraño
            expect(result).toBeDefined();
        });

        test('debería manejar enf como número', () => {
            const datos = crearDatosValidos();

            const result = InventariosService.construirQueryIngresoLote(
                datos, 12345, precioIdValido, userValido
            );

            expect(result.enf).toBe(12345);
        });

        test('debería manejar enf como objeto', () => {
            const datos = crearDatosValidos();
            const enfObjeto = { codigo: 'EF1-250601' };

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfObjeto, precioIdValido, userValido
            );

            expect(result.enf).toEqual({ codigo: 'EF1-250601' });
        });

        test('debería manejar fecha como Date object', () => {
            const fechaObj = new Date(2025, 5, 15, 10, 30, 0);
            const datos = crearDatosValidos({
                fecha_estimada_llegada: fechaObj
            });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            expect(result.fecha_salida_patio.getTime()).toBe(fechaObj.getTime());
        });

        test('debería manejar tipoFruta como undefined en datos', () => {
            const datos = crearDatosValidos({ tipoFruta: undefined });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            expect(result.tipoFruta).toBeUndefined();
        });

        test('debería manejar tipoFruta como null en datos', () => {
            const datos = crearDatosValidos({ tipoFruta: null });

            const result = InventariosService.construirQueryIngresoLote(
                datos, enfValido, precioIdValido, userValido
            );

            expect(result.tipoFruta).toBeNull();
        });
    });

});
