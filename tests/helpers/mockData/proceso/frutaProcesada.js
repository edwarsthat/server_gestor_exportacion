/**
 * Mock data para el schema FrutaProcesada
 *
 * Schema:
 * - loteId: ObjectId (required, refPath: loteType)
 * - loteType: String (required, enum: ['Lote', 'loteMaquila'])
 * - proceso: String (required, enum: ['Vaceo', 'Habilitar'])
 * - fechaProcesamiento: Date (default: Date.now)
 * - tipoFruta: ObjectId (ref: tipoFrutas)
 * - predio: ObjectId (ref: Proveedor)
 * - promedio: Number
 * - canastillas: Number
 * - detalles: Object
 * - createdAt: Date (default: Date.now)
 * - user: ObjectId (ref: usuario)
 * - timestamps: true (createdAt, updatedAt automáticos)
 */

import mongoose from 'mongoose';

const MOCK_IDS = {
    loteId: new mongoose.Types.ObjectId(),
    tipoFruta: new mongoose.Types.ObjectId(),
    predio: new mongoose.Types.ObjectId(),
    user: new mongoose.Types.ObjectId(),
};

// ============================================================
// DATOS VÁLIDOS
// ============================================================

/** Registro completo con todos los campos válidos */
export const frutaProcesadaValida = () => ({
    loteId: MOCK_IDS.loteId,
    loteType: 'Lote',
    proceso: 'Vaceo',
    fechaProcesamiento: new Date('2025-06-15T08:00:00Z'),
    tipoFruta: MOCK_IDS.tipoFruta,
    predio: MOCK_IDS.predio,
    promedio: 22.5,
    canastillas: 150,
    detalles: { observacion: 'Fruta en buen estado', turno: 'mañana' },
    user: MOCK_IDS.user,
});

/** Registro válido tipo loteMaquila con proceso Habilitar */
export const frutaProcesadaValidaMaquila = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'loteMaquila',
    proceso: 'Habilitar',
    fechaProcesamiento: new Date('2025-06-15T14:30:00Z'),
    tipoFruta: MOCK_IDS.tipoFruta,
    predio: MOCK_IDS.predio,
    promedio: 18.3,
    canastillas: 80,
    detalles: { observacion: 'Maquila externa' },
    user: MOCK_IDS.user,
});

/** Registro válido con solo los campos requeridos (mínimo viable) */
export const frutaProcesadaMinimaValida = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: 'Vaceo',
});

/** Registro válido con campos opcionales como null/undefined */
export const frutaProcesadaValidaSinOpcionales = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'loteMaquila',
    proceso: 'Habilitar',
    tipoFruta: null,
    predio: null,
    promedio: undefined,
    canastillas: undefined,
    detalles: undefined,
    user: null,
});

/** Registro válido con canastillas y promedio en cero */
export const frutaProcesadaValidaCeros = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: 'Vaceo',
    promedio: 0,
    canastillas: 0,
    detalles: {},
    user: MOCK_IDS.user,
});

// ============================================================
// DATOS INVÁLIDOS
// ============================================================

/** Sin loteId (requerido) */
export const frutaProcesadaSinLoteId = () => ({
    loteType: 'Lote',
    proceso: 'Vaceo',
});

/** Sin loteType (requerido) */
export const frutaProcesadaSinLoteType = () => ({
    loteId: new mongoose.Types.ObjectId(),
    proceso: 'Vaceo',
});

/** Sin proceso (requerido) */
export const frutaProcesadaSinProceso = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
});

/** loteType con valor fuera del enum */
export const frutaProcesadaLoteTypeInvalido = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'LoteInexistente',
    proceso: 'Vaceo',
});

/** proceso con valor fuera del enum */
export const frutaProcesadaProcesoInvalido = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: 'ProcesoFalso',
});

/** loteId como string no válido (no ObjectId) */
export const frutaProcesadaLoteIdStringInvalido = () => ({
    loteId: 'no-es-un-objectid',
    loteType: 'Lote',
    proceso: 'Vaceo',
});

/** canastillas como string (espera Number) */
export const frutaProcesadaCanastillasString = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: 'Vaceo',
    canastillas: 'cincuenta',
});

/** promedio como string (espera Number) */
export const frutaProcesadaPromedioString = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: 'Vaceo',
    promedio: 'veintidos',
});

/** fechaProcesamiento como string inválido */
export const frutaProcesadaFechaInvalida = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: 'Vaceo',
    fechaProcesamiento: 'no-es-una-fecha',
});

/** Todos los campos requeridos vacíos */
export const frutaProcesadaTodosVacios = () => ({
    loteId: '',
    loteType: '',
    proceso: '',
});

// ============================================================
// DATOS MALICIOSOS
// ============================================================

/** NoSQL injection: operador $ne en loteType */
export const frutaProcesadaNoSQLLoteType = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: { $ne: null },
    proceso: 'Vaceo',
});

/** NoSQL injection: operador $gt en proceso */
export const frutaProcesadaNoSQLProceso = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: { $gt: '' },
});

/** NoSQL injection: $regex en loteType */
export const frutaProcesadaNoSQLRegex = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: { $regex: '.*' },
    proceso: 'Vaceo',
});

/** NoSQL injection: $where en detalles */
export const frutaProcesadaNoSQLWhere = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: 'Vaceo',
    detalles: { $where: 'function(){ return true }' },
});

/** NoSQL injection: operador $exists en loteId */
export const frutaProcesadaNoSQLExists = () => ({
    loteId: { $exists: true },
    loteType: 'Lote',
    proceso: 'Vaceo',
});

/** NoSQL injection: operador $in en proceso */
export const frutaProcesadaNoSQLIn = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: { $in: ['Vaceo', 'Habilitar'] },
});

/** XSS: script tag en loteType */
export const frutaProcesadaXSSLoteType = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: '<script>alert("xss")</script>',
    proceso: 'Vaceo',
});

/** XSS: script tag en detalles */
export const frutaProcesadaXSSDetalles = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: 'Vaceo',
    detalles: { nota: '<img src=x onerror=alert(1)>' },
});

/** Prototype pollution: __proto__ en detalles */
export const frutaProcesadaPrototypePollution = () => {
    const data = {
        loteId: new mongoose.Types.ObjectId(),
        loteType: 'Lote',
        proceso: 'Vaceo',
        detalles: JSON.parse('{"__proto__":{"isAdmin":true}}'),
    };
    return data;
};

/** Prototype pollution: constructor.prototype */
export const frutaProcesadaConstructorPollution = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: 'Vaceo',
    detalles: { constructor: { prototype: { pwned: true } } },
});

/** Valores numéricos extremos */
export const frutaProcesadaNumerosExtremos = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: 'Vaceo',
    promedio: Infinity,
    canastillas: -Infinity,
});

/** NaN en campos numéricos */
export const frutaProcesadaNaN = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: 'Vaceo',
    promedio: NaN,
    canastillas: NaN,
});

/** Valores numéricos negativos */
export const frutaProcesadaNegativos = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: 'Vaceo',
    promedio: -999999,
    canastillas: -1,
});

/** Path traversal en detalles */
export const frutaProcesadaPathTraversal = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: 'Vaceo',
    detalles: { ruta: '../../etc/passwd', archivo: '/etc/shadow' },
});

/** Payload masivo en detalles */
export const frutaProcesadaPayloadMasivo = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: 'Vaceo',
    detalles: { spam: 'A'.repeat(1_000_000) },
});

/** Campos requeridos como null */
export const frutaProcesadaRequeridosNull = () => ({
    loteId: null,
    loteType: null,
    proceso: null,
});

/** Campos requeridos como arrays */
export const frutaProcesadaRequeridosArrays = () => ({
    loteId: [new mongoose.Types.ObjectId()],
    loteType: ['Lote'],
    proceso: ['Vaceo'],
});

/** Inyección de campos extra no definidos en el schema */
export const frutaProcesadaCamposExtra = () => ({
    loteId: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    proceso: 'Vaceo',
    admin: true,
    role: 'superadmin',
    password: 'hacked123',
    $set: { loteType: 'loteMaquila' },
});
