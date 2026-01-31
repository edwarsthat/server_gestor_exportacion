/**
 * Mock data para el schema Lotes (dataSchema)
 *
 * Schema principal:
 * - enf: String
 * - canastillas: Number (default: 0)
 * - canastillas_estimadas: Number
 * - kilos: Number
 * - kilos_estimados: Number
 * - kilosVaciados: Number (default: 0)
 * - kilosProcesados: Number (default: 0)
 * - kilosReprocesados: Number (default: 0)
 * - promedio: Number
 * - deshidratacion: Number (default: 100)
 * - directoNacional: Number (default: 0)
 * - frutaNacional: Number (default: 0)
 * - rendimiento: Number (default: 0)
 * - numeroPrecintos: Number
 * - GGN: Boolean (default: false)
 * - finalizado: Boolean (default: false)
 * - flag_balin_free: Boolean (default: true)
 * - informeEnviado: Boolean (default: false)
 * - aprobacionComercial: Boolean (default: false)
 * - aprobacionProduccion: Boolean (default: false)
 * - not_pass: Boolean
 * - predio: ObjectId ref 'Proveedor'
 * - tipoFruta: ObjectId ref 'tipoFrutas'
 * - precio: ObjectId ref 'precio'
 * - user: ObjectId ref 'usuario'
 * - historialDescarte: ObjectId
 * - contenedores: [String]
 * - descartes: Map of Number (default: {})
 * - observaciones: String
 * - placa: String
 * - numeroRemision: String
 * - fecha_creacion: Date (default: new Date())
 * - fechaIngreso: Date
 * - fecha_estimada_llegada: Date
 * - fecha_ingreso_patio: Date
 * - fecha_salida_patio: Date
 * - fecha_ingreso_inventario: Date
 * - fechaProceso: Date
 * - fecha_finalizado_proceso: Date
 * - fecha_aprobacion_produccion: Date
 * - fecha_aprobacion_comercial: Date
 * - calidad: calidadSchema (inspeccionIngreso, calidadInterna, clasificacionCalidad, fotosCalidad)
 * - desverdizado: desverdizadoSchema
 * - infoSalidaDirectoNacional: salidaDirectoNacionalSchema
 * - salidaExportacion: salidaExportacionSchema
 */

import mongoose from 'mongoose';

const MOCK_IDS = {
    predio: new mongoose.Types.ObjectId(),
    tipoFruta: new mongoose.Types.ObjectId(),
    precio: new mongoose.Types.ObjectId(),
    user: new mongoose.Types.ObjectId(),
    historialDescarte: new mongoose.Types.ObjectId(),
    calidad: new mongoose.Types.ObjectId(),
    cliente: new mongoose.Types.ObjectId(),
    contenedor1: new mongoose.Types.ObjectId(),
    contenedor2: new mongoose.Types.ObjectId(),
    descarte1: new mongoose.Types.ObjectId(),
    descarte2: new mongoose.Types.ObjectId(),
};

// ============================================================
// DATOS VÁLIDOS
// ============================================================

/** Lote completo con todos los campos válidos */
export const loteCompleto = () => ({
    enf: 'EF1-001',
    canastillas: 200,
    canastillas_estimadas: 210,
    kilos: 4500,
    kilos_estimados: 4600,
    kilosVaciados: 4500,
    kilosProcesados: 3800,
    kilosReprocesados: 100,
    promedio: 22.5,
    deshidratacion: 95,
    directoNacional: 200,
    frutaNacional: 150,
    rendimiento: 84.4,
    numeroPrecintos: 3,
    GGN: true,
    finalizado: true,
    flag_balin_free: true,
    informeEnviado: true,
    aprobacionComercial: true,
    aprobacionProduccion: true,
    not_pass: false,
    predio: MOCK_IDS.predio,
    tipoFruta: MOCK_IDS.tipoFruta,
    precio: MOCK_IDS.precio,
    user: MOCK_IDS.user,
    historialDescarte: MOCK_IDS.historialDescarte,
    contenedores: ['C-001', 'C-002'],
    descartes: new Map([
        [MOCK_IDS.descarte1.toString(), 120],
        [MOCK_IDS.descarte2.toString(), 85],
    ]),
    observaciones: 'Lote procesado sin novedades',
    placa: 'ABC123',
    numeroRemision: 'REM-2025-0456',
    fecha_creacion: new Date('2025-06-01T08:00:00Z'),
    fechaIngreso: new Date('2025-06-01T10:00:00Z'),
    fecha_estimada_llegada: new Date('2025-06-01T07:00:00Z'),
    fecha_ingreso_patio: new Date('2025-06-01T10:30:00Z'),
    fecha_salida_patio: new Date('2025-06-01T14:00:00Z'),
    fecha_ingreso_inventario: new Date('2025-06-01T11:00:00Z'),
    fechaProceso: new Date('2025-06-02T06:00:00Z'),
    fecha_finalizado_proceso: new Date('2025-06-02T18:00:00Z'),
    fecha_aprobacion_produccion: new Date('2025-06-03T09:00:00Z'),
    fecha_aprobacion_comercial: new Date('2025-06-03T15:00:00Z'),
    calidad: {
        inspeccionIngreso: {
            coloracion: '3',
            firmeza: 'buena',
            fecha: new Date('2025-06-01T10:15:00Z'),
        },
        calidadInterna: {
            acidez: 1.2,
            brix: 11.5,
            ratio: 9.58,
            peso: 180,
            zumo: 45,
            user: MOCK_IDS.user,
            semillas: false,
            calidad: MOCK_IDS.calidad,
            fecha: new Date('2025-06-01T11:00:00Z'),
        },
        clasificacionCalidad: {
            extra: '60',
            primera: '30',
            segunda: '10',
            fecha: new Date('2025-06-01T12:00:00Z'),
            user: MOCK_IDS.user,
        },
        fotosCalidad: {
            url1: 'https://storage.example.com/foto1.jpg',
            url2: 'https://storage.example.com/foto2.jpg',
            fechaIngreso: new Date('2025-06-01T12:30:00Z'),
        },
    },
    desverdizado: {
        canastillasIngreso: 200,
        cuartoDesverdizado: ['Cuarto-1', 'Cuarto-2'],
        fechaIngreso: new Date('2025-06-01T15:00:00Z'),
        fechaFinalizar: new Date('2025-06-03T06:00:00Z'),
        desverdizando: false,
        parametros: [
            { fecha: new Date('2025-06-01T18:00:00Z'), temperatura: 22, etileno: 3.5, carbono: 0.8, humedad: 90 },
            { fecha: new Date('2025-06-02T06:00:00Z'), temperatura: 21, etileno: 2.8, carbono: 1.0, humedad: 88 },
        ],
        fechaProcesado: new Date('2025-06-03T07:00:00Z'),
    },
    infoSalidaDirectoNacional: {
        placa: 'XYZ789',
        nombreConductor: 'Juan Pérez',
        telefono: '3001234567',
        cedula: '1234567890',
        remision: 'REM-DN-001',
        canastillas: 50,
        user: MOCK_IDS.user,
        cliente: MOCK_IDS.cliente,
        fecha: new Date('2025-06-02T08:00:00Z'),
        version: 1,
    },
    salidaExportacion: {
        kilosGGN: 3000,
        totalKilos: 3500,
        totalCajas: 280,
        porCalidad: new Map([
            ['extra', { kilos: 2100, cajas: 168 }],
            ['primera', { kilos: 1050, cajas: 84 }],
            ['segunda', { kilos: 350, cajas: 28 }],
        ]),
        porCalibre: new Map([
            ['calibre4', { kilos: 1500, cajas: 120 }],
            ['calibre5', { kilos: 2000, cajas: 160 }],
        ]),
        contenedores: [MOCK_IDS.contenedor1, MOCK_IDS.contenedor2],
    },
});

/** Lote mínimo: solo los campos con defaults, sin opcionales */
export const loteMinimo = () => ({
    enf: 'EF1-002',
    predio: new mongoose.Types.ObjectId(),
    tipoFruta: new mongoose.Types.ObjectId(),
});

/** Lote con todos los valores en sus defaults */
export const loteConDefaults = () => ({
    enf: 'EF1-003',
    canastillas: 0,
    kilosVaciados: 0,
    kilosProcesados: 0,
    kilosReprocesados: 0,
    deshidratacion: 100,
    directoNacional: 0,
    frutaNacional: 0,
    rendimiento: 0,
    GGN: false,
    finalizado: false,
    flag_balin_free: true,
    informeEnviado: false,
    aprobacionComercial: false,
    aprobacionProduccion: false,
    descartes: new Map(),
});

/** Lote con ENF que NO empieza con EF1- (para branch condicional en descartes) */
export const loteSinEF1 = () => ({
    enf: 'EF8-001',
    canastillas: 100,
    kilos: 2200,
    promedio: 22,
    predio: new mongoose.Types.ObjectId(),
    tipoFruta: MOCK_IDS.tipoFruta,
    user: MOCK_IDS.user,
});

/** Lote GGN activo */
export const loteGGN = () => ({
    enf: 'EF1-010',
    GGN: true,
    canastillas: 300,
    kilos: 6750,
    promedio: 22.5,
    predio: MOCK_IDS.predio,
    tipoFruta: MOCK_IDS.tipoFruta,
    user: MOCK_IDS.user,
});

/** Lote finalizado con aprobaciones */
export const loteFinalizado = () => ({
    enf: 'EF1-020',
    finalizado: true,
    aprobacionProduccion: true,
    aprobacionComercial: true,
    informeEnviado: true,
    canastillas: 180,
    kilos: 4050,
    kilosVaciados: 4050,
    kilosProcesados: 3400,
    rendimiento: 83.9,
    fecha_finalizado_proceso: new Date('2025-06-05T18:00:00Z'),
    fecha_aprobacion_produccion: new Date('2025-06-06T09:00:00Z'),
    fecha_aprobacion_comercial: new Date('2025-06-06T15:00:00Z'),
    predio: MOCK_IDS.predio,
    tipoFruta: MOCK_IDS.tipoFruta,
    user: MOCK_IDS.user,
});

/** Lote en proceso de desverdizado */
export const loteEnDesverdizado = () => ({
    enf: 'EF1-030',
    canastillas: 250,
    kilos: 5625,
    promedio: 22.5,
    predio: MOCK_IDS.predio,
    tipoFruta: MOCK_IDS.tipoFruta,
    user: MOCK_IDS.user,
    desverdizado: {
        canastillasIngreso: 250,
        cuartoDesverdizado: ['Cuarto-3'],
        fechaIngreso: new Date('2025-06-10T08:00:00Z'),
        desverdizando: true,
        parametros: [
            { fecha: new Date('2025-06-10T12:00:00Z'), temperatura: 23, etileno: 4.0, carbono: 0.5, humedad: 92 },
        ],
    },
});

/** Lote con calidad interna completa */
export const loteConCalidadInterna = () => ({
    enf: 'EF1-040',
    canastillas: 120,
    kilos: 2700,
    promedio: 22.5,
    predio: MOCK_IDS.predio,
    tipoFruta: MOCK_IDS.tipoFruta,
    user: MOCK_IDS.user,
    calidad: {
        calidadInterna: {
            acidez: 0.9,
            brix: 12.0,
            ratio: 13.33,
            peso: 200,
            zumo: 50,
            user: MOCK_IDS.user,
            semillas: true,
            calidad: MOCK_IDS.calidad,
            fecha: new Date('2025-06-12T10:00:00Z'),
        },
    },
});

/** Lote con salida directo nacional */
export const loteConSalidaDirectoNacional = () => ({
    enf: 'EF1-050',
    canastillas: 90,
    kilos: 2025,
    directoNacional: 500,
    frutaNacional: 500,
    predio: MOCK_IDS.predio,
    tipoFruta: MOCK_IDS.tipoFruta,
    user: MOCK_IDS.user,
    infoSalidaDirectoNacional: {
        placa: 'DEF456',
        nombreConductor: 'Carlos López',
        telefono: '3109876543',
        cedula: '9876543210',
        remision: 'REM-DN-002',
        canastillas: 90,
        user: MOCK_IDS.user,
        cliente: MOCK_IDS.cliente,
        fecha: new Date('2025-06-15T07:00:00Z'),
        version: 1,
    },
});

/** Lote con descartes registrados */
export const loteConDescartes = () => ({
    enf: 'EF1-060',
    canastillas: 160,
    kilos: 3600,
    kilosVaciados: 3600,
    kilosProcesados: 3000,
    promedio: 22.5,
    predio: MOCK_IDS.predio,
    tipoFruta: MOCK_IDS.tipoFruta,
    user: MOCK_IDS.user,
    descartes: new Map([
        [MOCK_IDS.descarte1.toString(), 350],
        [MOCK_IDS.descarte2.toString(), 250],
    ]),
});

// ============================================================
// DATOS INVÁLIDOS
// ============================================================

/** ObjectId inválido en predio */
export const lotePredioIdInvalido = () => ({
    enf: 'EF1-100',
    predio: 'no-es-un-objectid',
    tipoFruta: MOCK_IDS.tipoFruta,
});

/** ObjectId inválido en tipoFruta */
export const loteTipoFrutaIdInvalido = () => ({
    enf: 'EF1-101',
    predio: MOCK_IDS.predio,
    tipoFruta: 'invalido',
});

/** ObjectId inválido en user */
export const loteUserIdInvalido = () => ({
    enf: 'EF1-102',
    user: 12345,
});

/** ObjectId inválido en precio */
export const lotePrecioIdInvalido = () => ({
    enf: 'EF1-103',
    precio: { $ne: null },
});

/** Canastillas como string */
export const loteCanastillasString = () => ({
    enf: 'EF1-104',
    canastillas: 'doscientas',
});

/** Kilos como string no numérico */
export const loteKilosString = () => ({
    enf: 'EF1-105',
    kilos: 'muchos',
});

/** Promedio como string */
export const lotePromedioString = () => ({
    enf: 'EF1-106',
    promedio: 'veintidos',
});

/** Fechas como strings inválidos */
export const loteFechasInvalidas = () => ({
    enf: 'EF1-107',
    fecha_creacion: 'no-es-fecha',
    fechaIngreso: 'ayer',
    fecha_ingreso_patio: 12345,
});

/** Booleanos como strings */
export const loteBooleanosString = () => ({
    enf: 'EF1-108',
    GGN: 'si',
    finalizado: 'true',
    flag_balin_free: 1,
});

/** Descartes con valores no numéricos en el Map */
export const loteDescartesInvalidos = () => ({
    enf: 'EF1-109',
    descartes: new Map([
        ['descarte1', 'cien'],
        ['descarte2', null],
    ]),
});

/** Contenedores con tipos mixtos (espera [String]) */
export const loteContenedoresMixtos = () => ({
    enf: 'EF1-110',
    contenedores: [123, null, undefined, { id: 'C-001' }],
});

/** Calidad interna con valores fuera de rango lógico */
export const loteCalidadInternaFueraRango = () => ({
    enf: 'EF1-111',
    calidad: {
        calidadInterna: {
            acidez: -5,
            brix: -10,
            ratio: -1,
            peso: -200,
            zumo: -50,
            semillas: 'tal vez',
            calidad: 'no-es-objectid',
            user: 'no-es-objectid',
        },
    },
});

/** Desverdizado con parámetros inválidos */
export const loteDesverdizadoInvalido = () => ({
    enf: 'EF1-112',
    desverdizado: {
        canastillasIngreso: 'muchas',
        cuartoDesverdizado: [123, null],
        fechaIngreso: 'ayer',
        desverdizando: 'si',
        parametros: [
            { temperatura: 'caliente', etileno: 'alto', carbono: null, humedad: 'húmedo' },
        ],
    },
});

/** Salida directo nacional con campos inválidos */
export const loteSalidaDNInvalida = () => ({
    enf: 'EF1-113',
    infoSalidaDirectoNacional: {
        placa: 12345,
        nombreConductor: 67890,
        telefono: true,
        cedula: [],
        remision: { $ne: null },
        canastillas: 'cincuenta',
        user: 'no-objectid',
        cliente: 'no-objectid',
        version: 'uno',
    },
});

/** Salida exportación con Maps inválidos */
export const loteSalidaExportacionInvalida = () => ({
    enf: 'EF1-114',
    salidaExportacion: {
        kilosGGN: 'tres mil',
        totalKilos: -500,
        totalCajas: NaN,
        porCalidad: 'no es un map',
        porCalibre: null,
        contenedores: ['no-es-objectid', 12345],
    },
});

/** Rendimiento y deshidratación fuera de rango lógico */
export const loteRendimientoFueraRango = () => ({
    enf: 'EF1-115',
    rendimiento: 500,
    deshidratacion: -50,
    kilosProcesados: -100,
    kilosVaciados: -200,
});

// ============================================================
// DATOS MALICIOSOS
// ============================================================

/** NoSQL injection: operador $ne en enf */
export const loteNoSQLEnf = () => ({
    enf: { $ne: null },
    predio: MOCK_IDS.predio,
});

/** NoSQL injection: operador $gt en observaciones */
export const loteNoSQLObservaciones = () => ({
    enf: 'EF1-200',
    observaciones: { $gt: '' },
});

/** NoSQL injection: $regex en placa */
export const loteNoSQLPlaca = () => ({
    enf: 'EF1-201',
    placa: { $regex: '.*' },
});

/** NoSQL injection: $where en observaciones */
export const loteNoSQLWhere = () => ({
    enf: 'EF1-202',
    observaciones: { $where: 'function(){ return true }' },
});

/** NoSQL injection: $exists en predio */
export const loteNoSQLExists = () => ({
    enf: 'EF1-203',
    predio: { $exists: true },
});

/** NoSQL injection: $in en tipoFruta */
export const loteNoSQLIn = () => ({
    enf: 'EF1-204',
    tipoFruta: { $in: [MOCK_IDS.tipoFruta] },
});

/** NoSQL injection: operador $set inyectado como campo */
export const loteNoSQLSet = () => ({
    enf: 'EF1-205',
    $set: { finalizado: true, aprobacionComercial: true },
});

/** XSS: script tag en enf */
export const loteXSSEnf = () => ({
    enf: '<script>alert("xss")</script>',
    predio: MOCK_IDS.predio,
});

/** XSS: script tag en observaciones */
export const loteXSSObservaciones = () => ({
    enf: 'EF1-210',
    observaciones: '<img src=x onerror=alert(document.cookie)>',
});

/** XSS: event handler en placa */
export const loteXSSPlaca = () => ({
    enf: 'EF1-211',
    placa: '" onmouseover="alert(1)" data-x="',
});

/** XSS: en campos de salida directo nacional */
export const loteXSSSalidaDN = () => ({
    enf: 'EF1-212',
    infoSalidaDirectoNacional: {
        placa: '<script>steal()</script>',
        nombreConductor: '<img src=x onerror=alert(1)>',
        telefono: 'javascript:alert(1)',
        cedula: '"><svg/onload=alert(1)>',
        remision: '<iframe src="evil.com"></iframe>',
        canastillas: 50,
        user: MOCK_IDS.user,
        cliente: MOCK_IDS.cliente,
    },
});

/** XSS: en observaciones del campo calidad */
export const loteXSSCalidad = () => ({
    enf: 'EF1-213',
    calidad: {
        inspeccionIngreso: {
            coloracion: '<script>document.cookie</script>',
            fecha: new Date(),
        },
        clasificacionCalidad: {
            extra: '<img src=x onerror=alert(1)>',
            fecha: new Date(),
            user: MOCK_IDS.user,
        },
    },
});

/** Prototype pollution: __proto__ en calidad */
export const lotePrototypePollutionCalidad = () => {
    const data = {
        enf: 'EF1-220',
        calidad: JSON.parse('{"__proto__":{"isAdmin":true}}'),
    };
    return data;
};

/** Prototype pollution: constructor.prototype */
export const loteConstructorPollution = () => ({
    enf: 'EF1-221',
    calidad: {
        inspeccionIngreso: {
            constructor: { prototype: { pwned: true } },
        },
    },
});

/** Prototype pollution: __proto__ a nivel raíz */
export const lotePrototypePollutionRaiz = () => {
    const data = JSON.parse('{"enf":"EF1-222","__proto__":{"role":"admin","isAdmin":true}}');
    return data;
};

/** Valores numéricos extremos: Infinity */
export const loteNumerosInfinity = () => ({
    enf: 'EF1-230',
    canastillas: Infinity,
    kilos: -Infinity,
    promedio: Infinity,
    rendimiento: Infinity,
    deshidratacion: Infinity,
});

/** Valores numéricos extremos: NaN */
export const loteNumerosNaN = () => ({
    enf: 'EF1-231',
    canastillas: NaN,
    kilos: NaN,
    promedio: NaN,
    kilosVaciados: NaN,
    kilosProcesados: NaN,
});

/** Valores numéricos negativos */
export const loteNumerosNegativos = () => ({
    enf: 'EF1-232',
    canastillas: -100,
    kilos: -5000,
    promedio: -22.5,
    kilosVaciados: -1000,
    kilosProcesados: -500,
    directoNacional: -200,
    frutaNacional: -150,
    numeroPrecintos: -3,
});

/** Valores numéricos en el límite de Number */
export const loteNumerosLimite = () => ({
    enf: 'EF1-233',
    canastillas: Number.MAX_SAFE_INTEGER,
    kilos: Number.MAX_VALUE,
    promedio: Number.MIN_VALUE,
    rendimiento: Number.MAX_SAFE_INTEGER + 1,
});

/** Path traversal en strings */
export const lotePathTraversal = () => ({
    enf: '../../../etc/passwd',
    observaciones: '/etc/shadow',
    placa: '../../admin/config',
    numeroRemision: '..\\..\\windows\\system32',
});

/** Payload masivo en observaciones */
export const lotePayloadMasivo = () => ({
    enf: 'EF1-240',
    observaciones: 'A'.repeat(1_000_000),
    contenedores: Array(10_000).fill('C-SPAM'),
});

/** Payload masivo en desverdizado.parametros */
export const loteParametrosMasivos = () => ({
    enf: 'EF1-241',
    desverdizado: {
        canastillasIngreso: 100,
        cuartoDesverdizado: ['Cuarto-1'],
        desverdizando: true,
        parametros: Array(50_000).fill({
            temperatura: 22, etileno: 3.5, carbono: 0.8, humedad: 90,
        }),
    },
});

/** Campos extra no definidos en el schema */
export const loteCamposExtra = () => ({
    enf: 'EF1-250',
    admin: true,
    role: 'superadmin',
    password: 'hacked123',
    token: 'jwt-malicioso',
    $set: { finalizado: true },
    $inc: { kilosProcesados: 999999 },
});

/** Campos requeridos como null */
export const loteCamposNull = () => ({
    enf: null,
    canastillas: null,
    kilos: null,
    predio: null,
    tipoFruta: null,
    user: null,
    calidad: null,
    desverdizado: null,
});

/** Campos como arrays (tipos incorrectos) */
export const loteCamposArrays = () => ({
    enf: ['EF1-001', 'EF1-002'],
    canastillas: [100, 200],
    kilos: [1000, 2000],
    predio: [MOCK_IDS.predio],
    GGN: [true],
    finalizado: [false],
});

/** SQL injection en strings (no aplica en MongoDB pero es buena práctica testear) */
export const loteSQLInjection = () => ({
    enf: "EF1-001'; DROP TABLE lotes; --",
    observaciones: "'; DELETE FROM users WHERE '1'='1",
    placa: "1 OR 1=1",
    numeroRemision: "UNION SELECT * FROM credentials",
});

/** Command injection en strings */
export const loteCommandInjection = () => ({
    enf: 'EF1-001; rm -rf /',
    observaciones: '$(cat /etc/passwd)',
    placa: '`whoami`',
    numeroRemision: '| ls -la',
});

/** Unicode y caracteres especiales */
export const loteUnicode = () => ({
    enf: 'EF1-\u0000\u0001\u0002',
    observaciones: 'Texto con null bytes \x00 y control chars \x1B[31m',
    placa: '\uFEFF\u200B\u200C\u200D',
    numeroRemision: '🍊🍋🍈',
});

/** Descartes Map con claves maliciosas */
export const loteDescartesKeysMaliciosas = () => ({
    enf: 'EF1-260',
    descartes: new Map([
        ['$ne', 100],
        ['__proto__', 200],
        ['constructor', 300],
        ['hasOwnProperty', 400],
        ['a.b.c', 500],
    ]),
});
