import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock del config ANTES de cualquier import que lo use
const mockConfig = {};
jest.unstable_mockModule('../../../src/config/index.js', () => ({
    default: mockConfig
}));

// Importar DESPUÉS de configurar el mock
const { InventariosService } = await import('../../../server/services/inventarios.js');

/**
 * Tests unitarios para InventariosService.validarGGN
 *
 * Este método valida que un proveedor tenga GGN vigente para un tipo de fruta específico.
 * Verifica fechas de vencimiento, roles de usuario y tipos de fruta autorizados.
 */
describe('InventariosService.validarGGN', () => {

    // Helper para crear fechas relativas a hoy
    const crearFecha = (diasDesdeHoy) => {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + diasDesdeHoy);
        return fecha;
    };

    // Proveedor válido base para reutilizar
    const crearProveedorValido = (opciones = {}) => ({
        _id: '507f1f77bcf86cd799439011',
        PREDIO: 'Finca Test',
        GGN: {
            code: 'GGN-12345',
            fechaVencimiento: opciones.fechaVencimiento || crearFecha(60), // 60 días en el futuro
            tipo_fruta: opciones.tipo_fruta || ['Naranja', 'Limon']
        },
        ...opciones
    });

    const userAdmin = { Rol: 0, _id: 'user1' };
    const userCoordinador = { Rol: 2, _id: 'user2' };
    const userOperario = { Rol: 3, _id: 'user3' };

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

        test('debería retornar true con proveedor válido y GGN vigente', () => {
            const proveedor = crearProveedorValido();

            const result = InventariosService.validarGGN([proveedor], 'Naranja', userAdmin);

            expect(result).toBe(true);
        });

        test('debería retornar true con fecha de vencimiento lejana (más de 1 mes)', () => {
            const proveedor = crearProveedorValido({
                fechaVencimiento: crearFecha(90) // 90 días en el futuro
            });

            const result = InventariosService.validarGGN([proveedor], 'Naranja', userAdmin);

            expect(result).toBe(true);
        });

        test('debería retornar true con fecha cercana y usuario con Rol <= 2', () => {
            const proveedor = crearProveedorValido({
                fechaVencimiento: crearFecha(15) // 15 días en el futuro (dentro de 1 mes)
            });

            const result = InventariosService.validarGGN([proveedor], 'Naranja', userCoordinador);

            expect(result).toBe(true);
        });

        test('debería retornar true con fecha cercana y usuario con Rol = 0 (admin)', () => {
            const proveedor = crearProveedorValido({
                fechaVencimiento: crearFecha(10)
            });

            const result = InventariosService.validarGGN([proveedor], 'Naranja', userAdmin);

            expect(result).toBe(true);
        });

        test('debería validar correctamente diferentes tipos de fruta', () => {
            const proveedor = crearProveedorValido({
                tipo_fruta: ['Naranja', 'Limon', 'Mandarina']
            });

            expect(InventariosService.validarGGN([proveedor], 'Naranja', userAdmin)).toBe(true);
            expect(InventariosService.validarGGN([proveedor], 'Limon', userAdmin)).toBe(true);
            expect(InventariosService.validarGGN([proveedor], 'Mandarina', userAdmin)).toBe(true);
        });
    });

    // ============================================================
    // TEST GROUP: Validación de Proveedores
    // ============================================================
    describe('validación de proveedores', () => {

        test('debería lanzar error si proveedores es null', () => {
            expect(() => InventariosService.validarGGN(null, 'Naranja', userAdmin))
                .toThrow('No se proporcionaron proveedores');
        });

        test('debería lanzar error si proveedores es undefined', () => {
            expect(() => InventariosService.validarGGN(undefined, 'Naranja', userAdmin))
                .toThrow('No se proporcionaron proveedores');
        });

        test('debería lanzar error si proveedores no es un array', () => {
            expect(() => InventariosService.validarGGN({}, 'Naranja', userAdmin))
                .toThrow('No se proporcionaron proveedores');
        });

        test('debería lanzar error si proveedores es un string', () => {
            expect(() => InventariosService.validarGGN('proveedor', 'Naranja', userAdmin))
                .toThrow('No se proporcionaron proveedores');
        });

        test('debería lanzar error si proveedores es un array vacío', () => {
            expect(() => InventariosService.validarGGN([], 'Naranja', userAdmin))
                .toThrow('No se proporcionaron proveedores');
        });

        test('debería lanzar error si hay más de un proveedor', () => {
            const proveedor1 = crearProveedorValido();
            const proveedor2 = crearProveedorValido();

            expect(() => InventariosService.validarGGN([proveedor1, proveedor2], 'Naranja', userAdmin))
                .toThrow('Se proporcionaron más de un proveedor');
        });

        test('debería lanzar error si el proveedor es null', () => {
            expect(() => InventariosService.validarGGN([null], 'Naranja', userAdmin))
                .toThrow('El predio no tiene GGN');
        });

        test('debería lanzar error si el proveedor es undefined', () => {
            expect(() => InventariosService.validarGGN([undefined], 'Naranja', userAdmin))
                .toThrow('El predio no tiene GGN');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de GGN
    // ============================================================
    describe('validación de GGN', () => {

        test('debería lanzar error si proveedor no tiene GGN', () => {
            const proveedor = { _id: '123', PREDIO: 'Test' };

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', userAdmin))
                .toThrow('El predio no tiene GGN');
        });

        test('debería lanzar error si GGN es null', () => {
            const proveedor = { _id: '123', PREDIO: 'Test', GGN: null };

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', userAdmin))
                .toThrow('El predio no tiene GGN');
        });

        test('debería lanzar error si GGN no tiene fechaVencimiento', () => {
            const proveedor = {
                _id: '123',
                GGN: { code: 'GGN-123', tipo_fruta: ['Naranja'] }
            };

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', userAdmin))
                .toThrow('El predio no tiene GGN');
        });

        test('debería lanzar error si GGN no tiene code', () => {
            const proveedor = {
                _id: '123',
                GGN: {
                    fechaVencimiento: crearFecha(60),
                    tipo_fruta: ['Naranja']
                }
            };

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', userAdmin))
                .toThrow('El predio no tiene GGN');
        });

        test('debería lanzar error si tipo_fruta no es array', () => {
            const proveedor = {
                _id: '123',
                GGN: {
                    code: 'GGN-123',
                    fechaVencimiento: crearFecha(60),
                    tipo_fruta: 'Naranja' // string en vez de array
                }
            };

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', userAdmin))
                .toThrow('El predio no tiene GGN');
        });

        test('debería lanzar error si tipo_fruta es null', () => {
            const proveedor = {
                _id: '123',
                GGN: {
                    code: 'GGN-123',
                    fechaVencimiento: crearFecha(60),
                    tipo_fruta: null
                }
            };

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', userAdmin))
                .toThrow('El predio no tiene GGN');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de Fecha de Vencimiento
    // ============================================================
    describe('validación de fecha de vencimiento', () => {

        test('debería lanzar error si GGN ya expiró', () => {
            const proveedor = crearProveedorValido({
                fechaVencimiento: crearFecha(-1) // Ayer
            });

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', userAdmin))
                .toThrow('El GGN del proveedor ya expiró.');
        });

        test('debería lanzar error si GGN expiró hace mucho tiempo', () => {
            const proveedor = crearProveedorValido({
                fechaVencimiento: crearFecha(-365) // Hace un año
            });

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', userAdmin))
                .toThrow('El GGN del proveedor ya expiró.');
        });

        test('debería lanzar error si fechaVencimiento es inválida (string no parseable)', () => {
            const proveedor = crearProveedorValido();
            proveedor.GGN.fechaVencimiento = 'fecha-invalida';

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', userAdmin))
                .toThrow('El predio no tiene una fecha de vencimiento válida');
        });

        test('debería lanzar error si fechaVencimiento es un objeto inválido', () => {
            const proveedor = crearProveedorValido();
            proveedor.GGN.fechaVencimiento = { año: 2025 };

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', userAdmin))
                .toThrow('El predio no tiene una fecha de vencimiento válida');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de Fecha Cercana y Roles
    // ============================================================
    describe('validación de fecha cercana y roles', () => {

        test('debería lanzar error si fecha cercana y usuario con Rol > 2', () => {
            const proveedor = crearProveedorValido({
                fechaVencimiento: crearFecha(15) // 15 días (dentro de 1 mes)
            });

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', userOperario))
                .toThrow('La fecha de vencimiento está cercana.');
        });

        test('debería lanzar error si fecha cercana y Rol = 3', () => {
            const proveedor = crearProveedorValido({
                fechaVencimiento: crearFecha(20)
            });

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', { Rol: 3 }))
                .toThrow('La fecha de vencimiento está cercana.');
        });

        test('debería lanzar error si fecha cercana y Rol = 10', () => {
            const proveedor = crearProveedorValido({
                fechaVencimiento: crearFecha(5)
            });

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', { Rol: 10 }))
                .toThrow('La fecha de vencimiento está cercana.');
        });

        test('debería permitir fecha cercana con Rol = 1', () => {
            const proveedor = crearProveedorValido({
                fechaVencimiento: crearFecha(10)
            });

            const result = InventariosService.validarGGN([proveedor], 'Naranja', { Rol: 1 });
            expect(result).toBe(true);
        });

        test('debería permitir fecha cercana con Rol = 2 (límite)', () => {
            const proveedor = crearProveedorValido({
                fechaVencimiento: crearFecha(10)
            });

            const result = InventariosService.validarGGN([proveedor], 'Naranja', { Rol: 2 });
            expect(result).toBe(true);
        });

        test('debería lanzar error si fecha cercana y user es null', () => {
            const proveedor = crearProveedorValido({
                fechaVencimiento: crearFecha(15)
            });

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', null))
                .toThrow('No se proporcionó el rol del usuario');
        });

        test('debería lanzar error si fecha cercana y user es undefined', () => {
            const proveedor = crearProveedorValido({
                fechaVencimiento: crearFecha(15)
            });

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', undefined))
                .toThrow('No se proporcionó el rol del usuario');
        });

        test('debería lanzar error si fecha cercana y user.Rol no es número', () => {
            const proveedor = crearProveedorValido({
                fechaVencimiento: crearFecha(15)
            });

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', { Rol: '2' }))
                .toThrow('No se proporcionó el rol del usuario');
        });

        test('debería lanzar error si fecha cercana y user no tiene Rol', () => {
            const proveedor = crearProveedorValido({
                fechaVencimiento: crearFecha(15)
            });

            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', { _id: 'user1' }))
                .toThrow('No se proporcionó el rol del usuario');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de Tipo de Fruta
    // ============================================================
    describe('validación de tipo de fruta', () => {

        test('debería lanzar error si tipoFruta no está en la lista del GGN', () => {
            const proveedor = crearProveedorValido({
                tipo_fruta: ['Naranja', 'Limon']
            });

            expect(() => InventariosService.validarGGN([proveedor], 'Mandarina', userAdmin))
                .toThrow('El proveedor no tiene GGN para ese tipo de fruta');
        });

        test('debería lanzar error si tipoFruta es undefined', () => {
            const proveedor = crearProveedorValido();

            expect(() => InventariosService.validarGGN([proveedor], undefined, userAdmin))
                .toThrow('El proveedor no tiene GGN para ese tipo de fruta');
        });

        test('debería lanzar error si tipoFruta es null', () => {
            const proveedor = crearProveedorValido();

            expect(() => InventariosService.validarGGN([proveedor], null, userAdmin))
                .toThrow('El proveedor no tiene GGN para ese tipo de fruta');
        });

        test('debería lanzar error si tipoFruta es string vacío', () => {
            const proveedor = crearProveedorValido();

            expect(() => InventariosService.validarGGN([proveedor], '', userAdmin))
                .toThrow('El proveedor no tiene GGN para ese tipo de fruta');
        });

        test('debería ser case-sensitive en la validación de tipoFruta', () => {
            const proveedor = crearProveedorValido({
                tipo_fruta: ['Naranja']
            });

            // 'naranja' !== 'Naranja'
            expect(() => InventariosService.validarGGN([proveedor], 'naranja', userAdmin))
                .toThrow('El proveedor no tiene GGN para ese tipo de fruta');
        });
    });

    // ============================================================
    // TEST GROUP: Casos Edge
    // ============================================================
    describe('casos edge', () => {

        test('debería manejar fecha de vencimiento exactamente hoy (expirado)', () => {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            const proveedor = crearProveedorValido({
                fechaVencimiento: hoy
            });

            // Depende de la hora exacta, pero generalmente < hoy
            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', userAdmin))
                .toThrow('El GGN del proveedor ya expiró.');
        });

        test('debería manejar fecha de vencimiento exactamente en 1 mes (límite cercano)', () => {
            const unMesDespues = new Date();
            unMesDespues.setMonth(unMesDespues.getMonth() + 1);

            const proveedor = crearProveedorValido({
                fechaVencimiento: unMesDespues
            });

            // En el límite, Rol > 2 debería fallar
            expect(() => InventariosService.validarGGN([proveedor], 'Naranja', userOperario))
                .toThrow('La fecha de vencimiento está cercana.');
        });

        test('debería manejar fecha de vencimiento 1 día después del mes (no cercana)', () => {
            const masDeUnMes = new Date();
            masDeUnMes.setMonth(masDeUnMes.getMonth() + 1);
            masDeUnMes.setDate(masDeUnMes.getDate() + 1);

            const proveedor = crearProveedorValido({
                fechaVencimiento: masDeUnMes
            });

            // Fuera del rango "cercano", debería pasar
            const result = InventariosService.validarGGN([proveedor], 'Naranja', userOperario);
            expect(result).toBe(true);
        });

        test('debería funcionar con proveedor que tiene muchos tipos de fruta', () => {
            const proveedor = crearProveedorValido({
                tipo_fruta: ['Naranja', 'Limon', 'Mandarina', 'Pomelo', 'Lima', 'Toronja']
            });

            expect(InventariosService.validarGGN([proveedor], 'Toronja', userAdmin)).toBe(true);
        });

        test('debería funcionar con código GGN largo', () => {
            const proveedor = crearProveedorValido();
            proveedor.GGN.code = 'GGN-1234567890-ABCDEFGHIJ-2025';

            const result = InventariosService.validarGGN([proveedor], 'Naranja', userAdmin);
            expect(result).toBe(true);
        });
    });

});
