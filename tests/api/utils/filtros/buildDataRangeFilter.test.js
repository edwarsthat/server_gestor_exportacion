import { describe, test, expect } from '@jest/globals';
import { buildDateRangeFilter } from '../../../../server/api/utils/filtros.js';
import { UtilError } from '../../../../Error/ProcessError.js';

describe('buildDateRangeFilter', () => {

    // ============================================================
    // CASOS DE ÉXITO
    // ============================================================
    describe('casos de éxito', () => {

        test('debería retornar el baseFilter si no se proporciona start ni end', () => {
            const baseFilter = { activo: true };
            const result = buildDateRangeFilter(null, null, 'fecha', baseFilter);
            expect(result).toEqual({ activo: true });
            expect(result).not.toBe(baseFilter); // Inmutabilidad
        });

        test('debería crear un rango completo si se proporcionan start y end', () => {
            const start = '2023-01-01';
            const end = '2023-01-02';
            const field = 'createdAt';

            const result = buildDateRangeFilter(start, end, field);

            expect(result[field]).toBeDefined();
            expect(result[field].$gte).toBeInstanceOf(Date);
            expect(result[field].$lte).toBeInstanceOf(Date);

            // Verificar normalización de horas (00:00:00 y 23:59:59.999)
            // Usamos .getTime() o comparamos componentes para evitar problemas de zona horaria local en el runner
            expect(result[field].$gte.getHours()).toBe(0);
            expect(result[field].$gte.getMinutes()).toBe(0);
            expect(result[field].$lte.getHours()).toBe(23);
            expect(result[field].$lte.getMilliseconds()).toBe(999);
        });

        test('debería crear solo $gte si solo se proporciona start', () => {
            const start = '2023-05-20T12:00:00';
            const result = buildDateRangeFilter(start, null, 'fecha');

            expect(result.fecha).toBeDefined();
            expect(result.fecha.$gte).toBeInstanceOf(Date);
            expect(result.fecha.$gte.getDate()).toBe(20);
            expect(result.fecha.$lte).toBeUndefined();
        });

        test('debería crear solo $lte si solo se proporciona end', () => {
            const end = '2023-12-31';
            const result = buildDateRangeFilter(null, end, 'fecha');

            expect(result.fecha).toBeDefined();
            expect(result.fecha.$lte).toBeInstanceOf(Date);
            expect(result.fecha.$lte.getMonth()).toBe(11); // Diciembre (0-indexed)
            expect(result.fecha.$gte).toBeUndefined();
        });

        test('debería mantener y no mutar el baseFilter', () => {
            const baseFilter = { tipo: 'Maquila' };
            const start = '2023-01-01';

            const result = buildDateRangeFilter(start, null, 'fecha', baseFilter);

            expect(result.tipo).toBe('Maquila');
            expect(result.fecha.$gte).toBeInstanceOf(Date);
            expect(baseFilter).toEqual({ tipo: 'Maquila' }); // No mutado
        });
    });

    // ============================================================
    // CASOS DE ERROR / BORDES
    // ============================================================
    describe('casos de error y bordes', () => {

        test('debería lanzar UtilError si no se proporciona el campo (field)', () => {
            expect(() => buildDateRangeFilter('2023-01-01', null, null))
                .toThrow(UtilError);
            expect(() => buildDateRangeFilter('2023-01-01', null, ""))
                .toThrow(/Debe especificar el nombre del campo/);
        });

        test('debería lanzar UtilError si la fecha de inicio no es válida', () => {
            expect(() => buildDateRangeFilter('esto-no-es-una-fecha', null, 'fecha'))
                .toThrow(UtilError);
            expect(() => buildDateRangeFilter('esto-no-es-una-fecha', null, 'fecha'))
                .toThrow(/Fecha inicio no válida/);
        });

        test('debería lanzar UtilError si la fecha de fin no es válida', () => {
            expect(() => buildDateRangeFilter(null, 'fecha-invalida', 'fecha'))
                .toThrow(UtilError);
            expect(() => buildDateRangeFilter(null, 'fecha-invalida', 'fecha'))
                .toThrow(/Fecha fin no válida/);
        });

        test('debería manejar strings vacíos tratándolos como falsey (no entrar en el bloque)', () => {
            const result = buildDateRangeFilter("", "", "fecha", { base: 1 });
            expect(result).toEqual({ base: 1 });
        });

        test('debería manejar null/undefined tratándolos como falsey', () => {
            const result = buildDateRangeFilter(null, undefined, "fecha", { base: 1 });
            expect(result).toEqual({ base: 1 });
        });
    });

    // ============================================================
    // SEGURIDAD E INYECCIÓN
    // ============================================================
    describe('seguridad e inyección', () => {

        test('debería rechazar objetos maliciosos que simulan fechas', () => {
            // Un objeto como { $ne: null } convertido a Date resultará en Invalid Date (NaN)
            expect(() => buildDateRangeFilter({ $ne: null }, null, 'fecha'))
                .toThrow(UtilError);
        });

        test('debería manejar inyección extraña en el nombre del campo (propiedad literal)', () => {
            // Usamos un campo que parece un comando o propiedad especial
            const maliciousField = "fecha'; DROP TABLE users; --";
            const result = buildDateRangeFilter('2023-01-01', null, maliciousField);

            expect(result[maliciousField]).toBeDefined();
            expect(result[maliciousField].$gte).toBeInstanceOf(Date);
        });

        test('debería prevenir contaminación de prototipo mediante el campo', () => {
            const maliciousField = "__proto__";
            const result = buildDateRangeFilter('2023-01-01', null, maliciousField);

            // Verificamos que no se haya contaminado el objeto global
            expect({}.hasOwnProperty('$gte')).toBe(false);
            // Y que el resultado tenga la propiedad de forma segura (Reflect.set)
            // Aunque en un objeto literal {} creado con {...baseFilter}, 
            // el Reflect.set(target, "__proto__", value) PODRÍA sobreescribir el prototipo del objeto 'result'
            // pero no el global Object.prototype.
            expect(Object.getPrototypeOf(result)).not.toBe(result[maliciousField]);
        });

        test('debería manejar fechas extremas (año 0)', () => {
            const start = '0000-01-01';
            const result = buildDateRangeFilter(start, null, 'fecha');
            expect(result.fecha.$gte).toBeInstanceOf(Date);
            expect(result.fecha.$gte.getFullYear()).toBeLessThan(1);
        });
    });

});
