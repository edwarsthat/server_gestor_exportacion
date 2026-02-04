import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock del config ANTES de cualquier import que lo use
const mockConfig = {};
jest.unstable_mockModule('../../../src/config/index.js', () => ({
    default: mockConfig
}));

// Importar DESPUÉS de configurar el mock
const { Seriales } = await import('../../../server/Class/Seriales.js');
const { dataService } = await import('../../../server/services/data.js');

/**
 * Tests unitarios para dataService.get_ef1_serial
 *
 * Este método genera un código ENF (identificador único) para lotes EF1.
 * El formato es: EF1-AAMMSSS donde AA=año, MM=mes, SSS=serial
 */
describe('dataService.get_ef1_serial', () => {

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

        test('debería generar código ENF correctamente con fecha proporcionada', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 5
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            // Usar fecha con hora específica para evitar problemas de zona horaria
            const fecha = new Date(2025, 2, 15); // Marzo 15, 2025 (mes 0-indexed)
            const result = await dataService.get_ef1_serial(fecha);

            expect(result).toBe('EF1-250305');
            expect(Seriales.get_seriales).toHaveBeenCalledWith('EF1-');
        });

        test('debería usar fecha actual cuando no se proporciona fecha', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 10
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            const result = await dataService.get_ef1_serial(null);

            // Verificar que el formato es correcto (no podemos saber la fecha exacta)
            expect(result).toMatch(/^EF1-\d{4,}/);
        });

        test('debería agregar padding con 0 cuando serial < 10', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 7
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            const result = await dataService.get_ef1_serial(new Date(2025, 0, 10)); // Enero 10

            expect(result).toBe('EF1-250107');
        });

        test('debería NO agregar padding cuando serial >= 10', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 25
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            const result = await dataService.get_ef1_serial(new Date(2025, 0, 10)); // Enero 10

            expect(result).toBe('EF1-250125');
        });

        test('debería manejar serial = 0 correctamente', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 0
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            const result = await dataService.get_ef1_serial(new Date(2025, 1, 15)); // Febrero 15

            expect(result).toBe('EF1-250200');
        });

        test('debería manejar serial = 1 correctamente (límite inferior)', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 1
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            const result = await dataService.get_ef1_serial(new Date(2025, 11, 1)); // Diciembre 1

            expect(result).toBe('EF1-251201');
        });

        test('debería manejar serial = 9 correctamente (límite antes de 10)', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 9
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            const result = await dataService.get_ef1_serial(new Date(2025, 10, 20)); // Noviembre 20

            expect(result).toBe('EF1-251109');
        });

        test('debería manejar serial = 10 correctamente (límite sin padding)', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 10
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            const result = await dataService.get_ef1_serial(new Date(2025, 4, 10)); // Mayo 10

            expect(result).toBe('EF1-250510');
        });

        test('debería manejar serial grande (>= 100)', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 150
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            const result = await dataService.get_ef1_serial(new Date(2025, 7, 1)); // Agosto 1

            expect(result).toBe('EF1-2508150');
        });

        test('debería aceptar fecha como string ISO', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 5
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            // Usar formato con hora para evitar problemas de zona horaria
            const result = await dataService.get_ef1_serial('2025-07-22T12:00:00');

            expect(result).toBe('EF1-250705');
        });

        test('debería aceptar fecha como timestamp', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 5
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            const timestamp = new Date(2025, 3, 10).getTime(); // Abril 10
            const result = await dataService.get_ef1_serial(timestamp);

            expect(result).toBe('EF1-250405');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de Registros EF1
    // ============================================================
    describe('validación de registros EF1', () => {

        test('debería lanzar error si no hay registros de EF1', async () => {
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue([]);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow('No se encontraron registros de EF1');
        });

        test('debería lanzar error si get_seriales retorna null', async () => {
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(null);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow('No se encontraron registros de EF1');
        });

        test('debería lanzar error si get_seriales retorna undefined', async () => {
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(undefined);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow('No se encontraron registros de EF1');
        });

        test('debería lanzar error si hay múltiples registros de EF1', async () => {
            const mockEF1Multiple = [
                { name: 'EF1-', serial: 5 },
                { name: 'EF1-', serial: 10 }
            ];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1Multiple);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow('Se encontraron múltiples registros de EF1, se esperaba uno solo');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de Campo Serial
    // ============================================================
    describe('validación de campo serial', () => {

        test('debería lanzar error si serial no es un número (string)', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: '5'
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow("El campo 'serial' no es un número válido en el registro de EF1");
        });

        test('debería lanzar error si serial es undefined', async () => {
            const mockEF1 = [{
                name: 'EF1-'
                // serial no definido
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow("El campo 'serial' no es un número válido en el registro de EF1");
        });

        test('debería lanzar error si serial es null', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: null
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow("El campo 'serial' no es un número válido en el registro de EF1");
        });

        test('debería lanzar error si serial es negativo', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: -5
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow("El campo 'serial' no es un número válido en el registro de EF1");
        });

        test('debería lanzar error si serial es NaN', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: NaN
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow("El campo 'serial' no es un número válido en el registro de EF1");
        });

        test('debería lanzar error si serial es Infinity', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: Infinity
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow("El campo 'serial' no es un número válido en el registro de EF1");
        });

        test('debería lanzar error si serial es -Infinity', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: -Infinity
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow("El campo 'serial' no es un número válido en el registro de EF1");
        });
    });

    // ============================================================
    // TEST GROUP: Validación de Campo Name
    // ============================================================
    describe('validación de campo name', () => {

        test('debería lanzar error si name no existe', async () => {
            const mockEF1 = [{
                serial: 5
                // name no definido
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow("El campo 'name' no existe o no es válido");
        });

        test('debería lanzar error si name es null', async () => {
            const mockEF1 = [{
                name: null,
                serial: 5
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow("El campo 'name' no existe o no es válido");
        });

        test('debería lanzar error si name es string vacío', async () => {
            const mockEF1 = [{
                name: '',
                serial: 5
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow("El campo 'name' no existe o no es válido");
        });

        test('debería lanzar error si name no es string (número)', async () => {
            const mockEF1 = [{
                name: 123,
                serial: 5
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow("El campo 'name' no existe o no es válido");
        });
    });

    // ============================================================
    // TEST GROUP: Validación de Fecha
    // ============================================================
    describe('validación de fecha', () => {

        test('debería lanzar error si fecha es inválida (string no parseable)', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 5
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            await expect(dataService.get_ef1_serial('fecha-invalida'))
                .rejects
                .toThrow('Fecha inválida proporcionada');
        });

        test('debería lanzar error si fecha es objeto inválido', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 5
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            await expect(dataService.get_ef1_serial({ año: 2025 }))
                .rejects
                .toThrow('Fecha inválida proporcionada');
        });

        test('NaN como fecha usa fecha actual (comportamiento de new Date(NaN) → Invalid Date → usa else)', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 5
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            // NaN es falsy, así que entra al else y usa new Date()
            // El método no lanza error porque la condición if(fecha) es false para NaN
            const result = await dataService.get_ef1_serial(NaN);
            expect(result).toMatch(/^EF1-\d{4}05$/);
        });
    });

    // ============================================================
    // TEST GROUP: Manejo de Errores del Repositorio
    // ============================================================
    describe('manejo de errores del repositorio', () => {

        test('debería propagar errores de Seriales.get_seriales', async () => {
            const dbError = new Error('Database connection failed');
            jest.spyOn(Seriales, 'get_seriales').mockRejectedValue(dbError);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow('Database connection failed');
        });

        test('debería propagar errores de timeout', async () => {
            const timeoutError = new Error('Operation timed out');
            jest.spyOn(Seriales, 'get_seriales').mockRejectedValue(timeoutError);

            await expect(dataService.get_ef1_serial())
                .rejects
                .toThrow('Operation timed out');
        });
    });

    // ============================================================
    // TEST GROUP: Casos Edge de Formato de Fecha
    // ============================================================
    describe('casos edge de formato de fecha', () => {

        test('debería formatear correctamente mes de un dígito (enero)', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 5
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            const result = await dataService.get_ef1_serial(new Date('2025-01-15'));

            expect(result).toBe('EF1-250105');
            expect(result).toMatch(/EF1-\d{4}0\d/); // Mes con padding
        });

        test('debería formatear correctamente mes de dos dígitos (diciembre)', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 5
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            const result = await dataService.get_ef1_serial(new Date('2025-12-15'));

            expect(result).toBe('EF1-251205');
        });

        test('debería manejar año con dos dígitos correctamente (2030)', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 5
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            const result = await dataService.get_ef1_serial(new Date('2030-06-15'));

            expect(result).toBe('EF1-300605');
        });

        test('debería manejar año 2000 (edge case Y2K)', async () => {
            const mockEF1 = [{
                name: 'EF1-',
                serial: 5
            }];
            jest.spyOn(Seriales, 'get_seriales').mockResolvedValue(mockEF1);

            const result = await dataService.get_ef1_serial(new Date('2000-06-15'));

            expect(result).toBe('EF1-000605');
        });
    });

});
