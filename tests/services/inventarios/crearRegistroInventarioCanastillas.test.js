import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock del config ANTES de cualquier import que lo use
const mockConfig = {};
jest.unstable_mockModule('../../../src/config/index.js', () => ({
    default: mockConfig
}));

// Importar DESPUÉS de configurar el mock
const { InventariosService } = await import('../../../server/services/inventarios.js');

/**
 * Tests unitarios para InventariosService.crearRegistroInventarioCanastillas
 *
 * Este método crea un objeto de registro para movimientos de canastillas en inventario.
 * Valida user, fecha y accion, y transforma los datos al formato esperado.
 */
describe('InventariosService.crearRegistroInventarioCanastillas', () => {

    // Datos válidos base para reutilizar
    const crearDatosValidos = (opciones = {}) => ({
        origen: '507f1f77bcf86cd799439011',
        destino: '507f1f77bcf86cd799439022',
        accion: 'ingreso',
        canastillas: 100,
        canastillasPrestadas: 20,
        remitente: 'Finca Test',
        destinatario: 'Bodega Principal',
        user: '507f1f77bcf86cd799439033',
        fecha: new Date(2025, 5, 15),
        observaciones: 'Test de canastillas',
        ...opciones
    });

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

        test('debería crear registro correctamente con datos válidos', () => {
            const datos = crearDatosValidos();

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result).toMatchObject({
                destino: datos.destino,
                origen: datos.origen,
                cantidad: {
                    propias: 100,
                    prestadas: 20
                },
                observaciones: 'Test de canastillas',
                referencia: 'C1',
                tipoMovimiento: 'ingreso',
                remitente: 'Finca Test',
                destinatario: 'Bodega Principal'
            });
            expect(result.fecha).toBeInstanceOf(Date);
            expect(result.usuario).toBe(datos.user);
        });

        test('debería asignar estado ENTREGADA para accion ingreso', () => {
            const datos = crearDatosValidos({ accion: 'ingreso' });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.estado).toBe('ENTREGADA');
        });

        test('debería asignar estado ENVIADA para accion salida', () => {
            const datos = crearDatosValidos({ accion: 'salida' });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.estado).toBe('ENVIADA');
        });

        test('debería asignar estado ENVIADA para accion traslado', () => {
            const datos = crearDatosValidos({ accion: 'traslado' });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.estado).toBe('ENVIADA');
        });

        test('debería asignar estado RETIRADA para accion retiro', () => {
            const datos = crearDatosValidos({ accion: 'retiro' });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.estado).toBe('RETIRADA');
        });

        test('debería asignar estado CANCELADA para accion cancelado', () => {
            const datos = crearDatosValidos({ accion: 'cancelado' });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.estado).toBe('CANCELADA');
        });

        test('debería aceptar fecha como string ISO', () => {
            const datos = crearDatosValidos({ fecha: '2025-06-15T12:00:00' });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.fecha).toBeInstanceOf(Date);
            expect(result.fecha.getFullYear()).toBe(2025);
        });

        test('debería aceptar fecha como timestamp', () => {
            const timestamp = new Date(2025, 5, 15).getTime();
            const datos = crearDatosValidos({ fecha: timestamp });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.fecha).toBeInstanceOf(Date);
        });

        test('debería usar valores por defecto para campos opcionales', () => {
            const datosMinimos = {
                user: 'user123',
                fecha: new Date(2025, 5, 15),
                accion: 'ingreso'
            };

            const result = InventariosService.crearRegistroInventarioCanastillas(datosMinimos);

            expect(result.origen).toBe('');
            expect(result.destino).toBe('');
            expect(result.cantidad.propias).toBe(0);
            expect(result.cantidad.prestadas).toBe(0);
            expect(result.remitente).toBe('');
            expect(result.destinatario).toBe('');
            expect(result.observaciones).toBe('');
        });

        test('debería siempre incluir referencia C1', () => {
            const datos = crearDatosValidos();

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.referencia).toBe('C1');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de User
    // ============================================================
    describe('validación de user', () => {

        test('debería lanzar error si user es undefined', () => {
            const datos = crearDatosValidos({ user: undefined });

            expect(() => InventariosService.crearRegistroInventarioCanastillas(datos))
                .toThrow('user y user._id son requeridos');
        });

        test('debería lanzar error si user es null', () => {
            const datos = crearDatosValidos({ user: null });

            expect(() => InventariosService.crearRegistroInventarioCanastillas(datos))
                .toThrow('user y user._id son requeridos');
        });

        test('debería lanzar error si user es string vacío', () => {
            const datos = crearDatosValidos({ user: '' });

            expect(() => InventariosService.crearRegistroInventarioCanastillas(datos))
                .toThrow('user y user._id son requeridos');
        });

        test('debería aceptar user como string válido', () => {
            const datos = crearDatosValidos({ user: '507f1f77bcf86cd799439033' });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.usuario).toBe('507f1f77bcf86cd799439033');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de Fecha
    // ============================================================
    describe('validación de fecha', () => {

        test('debería lanzar error si fecha es string vacío', () => {
            const datos = crearDatosValidos({ fecha: '' });

            expect(() => InventariosService.crearRegistroInventarioCanastillas(datos))
                .toThrow('fecha es requerida');
        });

        test('debería lanzar error si fecha es null', () => {
            const datos = crearDatosValidos({ fecha: null });

            expect(() => InventariosService.crearRegistroInventarioCanastillas(datos))
                .toThrow('fecha es requerida');
        });

        test('debería lanzar error si fecha es undefined', () => {
            const datos = crearDatosValidos({ fecha: undefined });

            expect(() => InventariosService.crearRegistroInventarioCanastillas(datos))
                .toThrow('fecha es requerida');
        });

        test('debería lanzar error si fecha es inválida (string no parseable)', () => {
            const datos = crearDatosValidos({ fecha: 'fecha-invalida' });

            expect(() => InventariosService.crearRegistroInventarioCanastillas(datos))
                .toThrow('fecha inválida');
        });

        test('debería lanzar error si fecha es objeto no-fecha', () => {
            const datos = crearDatosValidos({ fecha: { año: 2025 } });

            expect(() => InventariosService.crearRegistroInventarioCanastillas(datos))
                .toThrow('fecha inválida');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de Accion
    // ============================================================
    describe('validación de accion', () => {

        test('debería lanzar error si accion es string vacío', () => {
            const datos = crearDatosValidos({ accion: '' });

            expect(() => InventariosService.crearRegistroInventarioCanastillas(datos))
                .toThrow('accion es requerida');
        });

        test('debería lanzar error si accion es null', () => {
            const datos = crearDatosValidos({ accion: null });

            expect(() => InventariosService.crearRegistroInventarioCanastillas(datos))
                .toThrow('accion es requerida');
        });

        test('debería lanzar error si accion es undefined', () => {
            const datos = crearDatosValidos({ accion: undefined });

            expect(() => InventariosService.crearRegistroInventarioCanastillas(datos))
                .toThrow('accion es requerida');
        });

        test('debería manejar accion desconocida (estado undefined)', () => {
            const datos = crearDatosValidos({ accion: 'accion_desconocida' });

            expect(() => InventariosService.crearRegistroInventarioCanastillas(datos))
                .toThrow('Estado no definido.');
        });

        test('debería ser case-insensitive para accion (INGRESO → ENTREGADA)', () => {
            const datos = crearDatosValidos({ accion: 'INGRESO' });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.estado).toBe('ENTREGADA');
        });

        test('debería ser case-insensitive para accion (Salida → ENVIADA)', () => {
            const datos = crearDatosValidos({ accion: 'Salida' });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.estado).toBe('ENVIADA');
        });
    });

    // ============================================================
    // TEST GROUP: Valores Numéricos
    // ============================================================
    describe('valores numéricos', () => {

        test('debería aceptar canastillas = 0', () => {
            const datos = crearDatosValidos({ canastillas: 0 });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.cantidad.propias).toBe(0);
        });

        test('debería aceptar canastillasPrestadas = 0', () => {
            const datos = crearDatosValidos({ canastillasPrestadas: 0 });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.cantidad.prestadas).toBe(0);
        });

        test('debería aceptar valores negativos (no valida)', () => {
            const datos = crearDatosValidos({
                canastillas: -50,
                canastillasPrestadas: -10
            });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.cantidad.propias).toBe(-50);
            expect(result.cantidad.prestadas).toBe(-10);
        });

        test('debería aceptar valores grandes', () => {
            const datos = crearDatosValidos({
                canastillas: 1000000,
                canastillasPrestadas: 500000
            });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.cantidad.propias).toBe(1000000);
            expect(result.cantidad.prestadas).toBe(500000);
        });

        test('debería pasar NaN sin validar', () => {
            const datos = crearDatosValidos({ canastillas: NaN });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.cantidad.propias).toBe(NaN);
        });

        test('debería pasar Infinity sin validar', () => {
            const datos = crearDatosValidos({ canastillas: Infinity });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.cantidad.propias).toBe(Infinity);
        });
    });

    // ============================================================
    // TEST GROUP: Estructura del Resultado
    // ============================================================
    describe('estructura del resultado', () => {

        test('debería tener todas las propiedades esperadas', () => {
            const datos = crearDatosValidos();

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result).toHaveProperty('fecha');
            expect(result).toHaveProperty('destino');
            expect(result).toHaveProperty('origen');
            expect(result).toHaveProperty('cantidad');
            expect(result).toHaveProperty('cantidad.propias');
            expect(result).toHaveProperty('cantidad.prestadas');
            expect(result).toHaveProperty('observaciones');
            expect(result).toHaveProperty('referencia');
            expect(result).toHaveProperty('tipoMovimiento');
            expect(result).toHaveProperty('estado');
            expect(result).toHaveProperty('usuario');
            expect(result).toHaveProperty('remitente');
            expect(result).toHaveProperty('destinatario');
        });

        test('no debería incluir propiedades adicionales del input', () => {
            const datos = crearDatosValidos();
            datos.propiedadExtra = 'no debería aparecer';

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.propiedadExtra).toBeUndefined();
        });
    });

    // ============================================================
    // TEST GROUP: Casos Edge
    // ============================================================
    describe('casos edge', () => {

        test('debería manejar observaciones muy largas', () => {
            const observacionesLargas = 'A'.repeat(10000);
            const datos = crearDatosValidos({ observaciones: observacionesLargas });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.observaciones).toBe(observacionesLargas);
            expect(result.observaciones.length).toBe(10000);
        });

        test('debería manejar caracteres especiales en observaciones', () => {
            const datos = crearDatosValidos({
                observaciones: 'Observación con "comillas" y <tags> y émojis 🎉'
            });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.observaciones).toBe('Observación con "comillas" y <tags> y émojis 🎉');
        });

        test('debería manejar user como ObjectId string', () => {
            const userId = '507f1f77bcf86cd799439099';
            const datos = crearDatosValidos({ user: userId });

            const result = InventariosService.crearRegistroInventarioCanastillas(datos);

            expect(result.usuario).toBe(userId);
        });
    });

});
