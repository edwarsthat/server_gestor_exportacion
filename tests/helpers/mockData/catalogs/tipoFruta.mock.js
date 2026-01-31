/**
 * Mock data para el schema tipoFrutas
 *
 * Schema:
 * - tipoFruta: String (required, unique)
 * - valorPromedio: Number (required, default: 19)
 * - defectos: [String]
 * - rengoDeshidratacionPositiva: Number (required, default: 2)
 * - rengoDeshidratacionNegativa: Number (required, default: -1)
 * - calibres: [String]
 * - codExportacion: String
 * - codNacional: String
 * - createdAt: Date (default: new Date())
 * - descartes: [ObjectId ref 'descartes']
 * - descartesGenerales: [{ key: String, nombre: String, observaciones: String }]
 */

import mongoose from 'mongoose';

// ============================================================
// IDS COMPARTIDOS (importables desde otros mocks)
// ============================================================
export const TIPO_FRUTA_IDS = {
    naranja: new mongoose.Types.ObjectId(),
    limon: new mongoose.Types.ObjectId(),
    mandarina: new mongoose.Types.ObjectId(),
    pomelo: new mongoose.Types.ObjectId(),
};

const MOCK_DESCARTE_IDS = {
    descarte1: new mongoose.Types.ObjectId(),
    descarte2: new mongoose.Types.ObjectId(),
    descarte3: new mongoose.Types.ObjectId(),
};

// ============================================================
// DATOS VÁLIDOS
// ============================================================

/** Tipo fruta completo con todos los campos */
export const tipoFrutaCompleta = () => ({
    _id: TIPO_FRUTA_IDS.naranja,
    tipoFruta: 'Naranja',
    valorPromedio: 22.5,
    defectos: ['mancha', 'golpe', 'podredumbre', 'oleocelosis'],
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    calibres: ['calibre3', 'calibre4', 'calibre5', 'calibre6'],
    codExportacion: 'NAR-EXP',
    codNacional: 'NAR-NAC',
    createdAt: new Date('2025-01-15T08:00:00Z'),
    descartes: [MOCK_DESCARTE_IDS.descarte1, MOCK_DESCARTE_IDS.descarte2],
    descartesGenerales: [
        { key: 'balin', nombre: 'Balín', observaciones: 'Fruta con daño por balín' },
        { key: 'mancha', nombre: 'Mancha', observaciones: 'Mancha superficial' },
    ],
});

/** Tipo fruta con solo los campos requeridos */
export const tipoFrutaMinima = () => ({
    _id: TIPO_FRUTA_IDS.limon,
    tipoFruta: 'Limón',
    valorPromedio: 18.3,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
});

/** Tipo fruta con valores por defecto explícitos */
export const tipoFrutaConDefaults = () => ({
    _id: TIPO_FRUTA_IDS.mandarina,
    tipoFruta: 'Mandarina',
    valorPromedio: 19,
    defectos: [],
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    calibres: [],
    descartes: [],
    descartesGenerales: [],
});

/** Tipo fruta con muchos calibres y defectos */
export const tipoFrutaCompleja = () => ({
    _id: TIPO_FRUTA_IDS.pomelo,
    tipoFruta: 'Pomelo',
    valorPromedio: 25.0,
    defectos: ['mancha', 'golpe', 'podredumbre', 'oleocelosis', 'trips', 'acaro', 'cicatriz'],
    rengoDeshidratacionPositiva: 3,
    rengoDeshidratacionNegativa: -2,
    calibres: ['calibre2', 'calibre3', 'calibre4', 'calibre5', 'calibre6', 'calibre7'],
    codExportacion: 'POM-EXP',
    codNacional: 'POM-NAC',
    descartes: [MOCK_DESCARTE_IDS.descarte1, MOCK_DESCARTE_IDS.descarte2, MOCK_DESCARTE_IDS.descarte3],
    descartesGenerales: [
        { key: 'balin', nombre: 'Balín', observaciones: 'Daño mecánico' },
        { key: 'mancha', nombre: 'Mancha', observaciones: 'Mancha leve' },
        { key: 'podredumbre', nombre: 'Podredumbre', observaciones: 'Descarte total' },
    ],
});

/** Tipo fruta con valorPromedio bajo */
export const tipoFrutaPromedioBajo = () => ({
    _id: new mongoose.Types.ObjectId(),
    tipoFruta: 'Lima',
    valorPromedio: 8.5,
    rengoDeshidratacionPositiva: 1,
    rengoDeshidratacionNegativa: -0.5,
    calibres: ['calibre1', 'calibre2'],
});

/** Tipo fruta con valorPromedio alto */
export const tipoFrutaPromedioAlto = () => ({
    _id: new mongoose.Types.ObjectId(),
    tipoFruta: 'Toronja',
    valorPromedio: 35.0,
    rengoDeshidratacionPositiva: 4,
    rengoDeshidratacionNegativa: -3,
    calibres: ['calibre6', 'calibre7', 'calibre8'],
});

/** Tipo fruta sin campos opcionales */
export const tipoFrutaSinOpcionales = () => ({
    _id: new mongoose.Types.ObjectId(),
    tipoFruta: 'Tangelo',
    valorPromedio: 20.0,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
});

// ============================================================
// DATOS INVÁLIDOS
// ============================================================

/** Sin tipoFruta (required) */
export const tipoFrutaSinNombre = () => ({
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
});

/** Sin valorPromedio (required) */
export const tipoFrutaSinValorPromedio = () => ({
    tipoFruta: 'Naranja',
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
});

/** Sin rengoDeshidratacionPositiva (required) */
export const tipoFrutaSinDeshPositiva = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: 22.5,
    rengoDeshidratacionNegativa: -1,
});

/** Sin rengoDeshidratacionNegativa (required) */
export const tipoFrutaSinDeshNegativa = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
});

/** Sin ningún campo requerido */
export const tipoFrutaSinRequeridos = () => ({
    defectos: ['mancha'],
    calibres: ['calibre4'],
    codExportacion: 'TEST',
});

/** Campos requeridos como null */
export const tipoFrutaRequeridosNull = () => ({
    tipoFruta: null,
    valorPromedio: null,
    rengoDeshidratacionPositiva: null,
    rengoDeshidratacionNegativa: null,
});

/** Campos requeridos vacíos */
export const tipoFrutaRequeridosVacios = () => ({
    tipoFruta: '',
    valorPromedio: 0,
    rengoDeshidratacionPositiva: 0,
    rengoDeshidratacionNegativa: 0,
});

/** valorPromedio como string no numérico */
export const tipoFrutaValorPromedioString = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: 'veintidos',
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
});

/** tipoFruta como número */
export const tipoFrutaNombreNumero = () => ({
    tipoFruta: 12345,
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
});

/** defectos con tipos mixtos (espera [String]) */
export const tipoFrutaDefectosMixtos = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    defectos: [123, null, undefined, { tipo: 'mancha' }, true],
});

/** calibres con tipos mixtos */
export const tipoFrutaCalibresMixtos = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    calibres: [1, 2, null, { calibre: '4' }],
});

/** descartes con ObjectIds inválidos */
export const tipoFrutaDescartesInvalidos = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    descartes: ['no-es-objectid', 12345, null],
});

/** descartesGenerales con estructura incorrecta */
export const tipoFrutaDescartesGeneralesInvalidos = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    descartesGenerales: [
        { key: 123, nombre: null, observaciones: true },
        'no-es-un-objeto',
        12345,
    ],
});

/** Fecha inválida en createdAt */
export const tipoFrutaFechaInvalida = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    createdAt: 'no-es-fecha',
});

/** tipoFruta duplicado (viola unique) - retorna par de documentos */
export const tipoFrutaDuplicada = () => ([
    {
        tipoFruta: 'Naranja',
        valorPromedio: 22.5,
        rengoDeshidratacionPositiva: 2,
        rengoDeshidratacionNegativa: -1,
    },
    {
        tipoFruta: 'Naranja',
        valorPromedio: 18.0,
        rengoDeshidratacionPositiva: 3,
        rengoDeshidratacionNegativa: -2,
    },
]);

// ============================================================
// DATOS MALICIOSOS
// ============================================================

/** NoSQL injection: operador $ne en tipoFruta */
export const tipoFrutaNoSQLNombre = () => ({
    tipoFruta: { $ne: null },
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
});

/** NoSQL injection: $gt en valorPromedio */
export const tipoFrutaNoSQLValorPromedio = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: { $gt: 0 },
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
});

/** NoSQL injection: $regex en tipoFruta */
export const tipoFrutaNoSQLRegex = () => ({
    tipoFruta: { $regex: '.*' },
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
});

/** NoSQL injection: $where en codExportacion */
export const tipoFrutaNoSQLWhere = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    codExportacion: { $where: 'function(){ return true }' },
});

/** NoSQL injection: $set como campo */
export const tipoFrutaNoSQLSet = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    $set: { valorPromedio: 999 },
});

/** XSS: script tag en tipoFruta */
export const tipoFrutaXSSNombre = () => ({
    tipoFruta: '<script>alert("xss")</script>',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
});

/** XSS: en defectos */
export const tipoFrutaXSSDefectos = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    defectos: ['<img src=x onerror=alert(1)>', '<script>steal()</script>'],
});

/** XSS: en descartesGenerales */
export const tipoFrutaXSSDescartesGenerales = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    descartesGenerales: [
        { key: '<script>alert(1)</script>', nombre: '"><svg/onload=alert(1)>', observaciones: 'javascript:alert(1)' },
    ],
});

/** XSS: en codExportacion y codNacional */
export const tipoFrutaXSSCodigos = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    codExportacion: '<iframe src="evil.com"></iframe>',
    codNacional: '" onmouseover="alert(1)" data-x="',
});

/** Prototype pollution: __proto__ */
export const tipoFrutaPrototypePollution = () => {
    const data = {
        tipoFruta: 'Naranja',
        valorPromedio: 22.5,
        rengoDeshidratacionPositiva: 2,
        rengoDeshidratacionNegativa: -1,
    };
    data.__proto__ = { isAdmin: true, role: 'superadmin' };
    return data;
};

/** Prototype pollution: constructor.prototype en descartesGenerales */
export const tipoFrutaConstructorPollution = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    descartesGenerales: [
        { key: 'test', nombre: 'test', constructor: { prototype: { pwned: true } } },
    ],
});

/** Valores numéricos extremos: Infinity */
export const tipoFrutaInfinity = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: Infinity,
    rengoDeshidratacionPositiva: Infinity,
    rengoDeshidratacionNegativa: -Infinity,
});

/** Valores numéricos extremos: NaN */
export const tipoFrutaNaN = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: NaN,
    rengoDeshidratacionPositiva: NaN,
    rengoDeshidratacionNegativa: NaN,
});

/** Valores numéricos negativos en valorPromedio */
export const tipoFrutaPromedioNegativo = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: -22.5,
    rengoDeshidratacionPositiva: -5,
    rengoDeshidratacionNegativa: 10,
});

/** Valores numéricos en el límite de Number */
export const tipoFrutaNumerosLimite = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: Number.MAX_SAFE_INTEGER,
    rengoDeshidratacionPositiva: Number.MAX_VALUE,
    rengoDeshidratacionNegativa: -Number.MAX_VALUE,
});

/** Payload masivo en defectos y calibres */
export const tipoFrutaPayloadMasivo = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    defectos: Array(50_000).fill('defecto-spam'),
    calibres: Array(50_000).fill('calibre-spam'),
    descartesGenerales: Array(50_000).fill({ key: 'spam', nombre: 'spam', observaciones: 'A'.repeat(10_000) }),
});

/** Campos extra no definidos en el schema */
export const tipoFrutaCamposExtra = () => ({
    tipoFruta: 'Naranja',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    admin: true,
    role: 'superadmin',
    password: 'hacked123',
    $set: { valorPromedio: 0 },
    $inc: { valorPromedio: 999 },
});

/** Command injection en strings */
export const tipoFrutaCommandInjection = () => ({
    tipoFruta: 'Naranja; rm -rf /',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    codExportacion: '$(cat /etc/passwd)',
    codNacional: '`whoami`',
});

/** Unicode y caracteres especiales */
export const tipoFrutaUnicode = () => ({
    tipoFruta: 'Naranja\x00\x01\x02',
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    codExportacion: '\uFEFF\u200B\u200C',
    codNacional: '🍊🍋',
    defectos: ['defecto\x00null', '\u0000bypass'],
});

/** Campos requeridos como arrays */
export const tipoFrutaCamposArrays = () => ({
    tipoFruta: ['Naranja', 'Limón'],
    valorPromedio: [22.5],
    rengoDeshidratacionPositiva: [2],
    rengoDeshidratacionNegativa: [-1],
});

/** SQL injection en strings */
export const tipoFrutaSQLInjection = () => ({
    tipoFruta: "Naranja'; DROP TABLE tipoFrutas; --",
    valorPromedio: 22.5,
    rengoDeshidratacionPositiva: 2,
    rengoDeshidratacionNegativa: -1,
    codExportacion: "' OR '1'='1",
    codNacional: "UNION SELECT * FROM credentials",
});
