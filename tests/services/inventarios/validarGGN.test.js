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

        test('debería lanzar error si el proveedor es null', () => {
            expect(() => InventariosService.validarGGN([null], 'Naranja', userAdmin))
                .toThrow('El predio no tiene GGN');
        });

        test('debería lanzar error si el proveedor es undefined', () => {
            expect(() => InventariosService.validarGGN([undefined], 'Naranja', userAdmin))
                .toThrow('El predio no tiene GGN');
        });
    });

});
