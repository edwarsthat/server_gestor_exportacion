/**
 * Crea un documento de carnet de prueba
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Promise<Document>}
 */

import mongoose from 'mongoose';
import { testDb } from '../../mongoMemoryServer.js';

const VALID_EMPLOYEE_ID = new mongoose.Types.ObjectId();
const VALID_USER_ID = new mongoose.Types.ObjectId();

export async function createCarnetTest(overrides = {}) {
    if (!testDb.SchemaCarnets) {
        throw new Error('Los schemas no han sido definidos. Llama a defineTestSchemas primero.');
    }

    const defaultData = {
        type: 'final',
        status: 'stock',
        employeeId: null,
        tokenHash: null,
        isGenerated: false,
        SKU: Math.floor(Math.random() * 100000),
        issuedAt: null,
        expiresAt: null,
        user: VALID_USER_ID,
        assignedBy: null,
        notes: '',
        ...overrides
    };

    const doc = new testDb.SchemaCarnets(defaultData);
    return await doc.save();
}

/**
 * Crea un carnet temporal en stock (sin empleado asignado)
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Promise<Document>}
 */
export async function createCarnetTempStock(overrides = {}) {
    return await createCarnetTest({
        type: 'temp',
        status: 'stock',
        employeeId: null,
        ...overrides
    });
}

/**
 * Crea un carnet final activo asignado a un empleado
 * @param {mongoose.Types.ObjectId} employeeId - ID del empleado
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Promise<Document>}
 */
export async function createCarnetFinalActivo(employeeId, overrides = {}) {
    return await createCarnetTest({
        type: 'final',
        status: 'active',
        employeeId: employeeId || VALID_EMPLOYEE_ID,
        isGenerated: true,
        issuedAt: new Date(),
        assignedBy: VALID_USER_ID,
        ...overrides
    });
}

/**
 * Crea un carnet temporal activo asignado a un empleado
 * @param {mongoose.Types.ObjectId} employeeId - ID del empleado
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Promise<Document>}
 */
export async function createCarnetTempActivo(employeeId, overrides = {}) {
    return await createCarnetTest({
        type: 'temp',
        status: 'active',
        employeeId: employeeId || VALID_EMPLOYEE_ID,
        isGenerated: true,
        issuedAt: new Date(),
        assignedBy: VALID_USER_ID,
        ...overrides
    });
}
