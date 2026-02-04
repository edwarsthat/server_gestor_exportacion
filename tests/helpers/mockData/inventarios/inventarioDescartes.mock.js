import mongoose from 'mongoose';

/**
 * Genera un objeto mock para InventarioActualDescarte
 * Representa un registro de inventario de fruta de descarte disponible para ser procesado o descontado.
 */
export const createMockInventarioActualDescarte = (overrides = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    fechaIngreso: new Date(),
    lote: new mongoose.Types.ObjectId(),
    loteType: 'Lote',
    tipoFruta: new mongoose.Types.ObjectId(),
    area: 'LAVADO',
    tipoDescarte: new mongoose.Types.ObjectId(),
    kilosIniciales: 100,
    kilosActuales: 100,
    canastillasIniciales: 10,
    canastillasActuales: 10,
    estado: 'ACTIVO',
    user: new mongoose.Types.ObjectId(),
    observaciones: 'Mock de inventario inicial',
    ...overrides
});

/**
 * Genera un registro de inventario con valores aleatorios dentro de rangos realistas
 */
export const createRandomMockInventario = (overrides = {}) => {
    // Kilos entre 20 y 300
    const kilos = Math.floor(Math.random() * (300 - 20 + 1)) + 20;
    // Aproximadamente 1 canastilla por cada 18-22 kilos
    const canastillas = Math.ceil(kilos / (Math.floor(Math.random() * (22 - 18 + 1)) + 18));

    return createMockInventarioActualDescarte({
        kilosIniciales: kilos,
        kilosActuales: kilos,
        canastillasIniciales: canastillas,
        canastillasActuales: canastillas,
        ...overrides
    });
};

/**
 * Genera múltiples registros de inventario con fechas secuenciales (útil para pruebas FIFO)
 * @param {number} count - Cantidad de registros a generar
 * @param {Object} baseOverrides - Datos que compartirán todos los registros (ej: mismo tipoFruta)
 */
export const createManyMockInventarioActualDescarte = (count, baseOverrides = {}) => {
    return Array.from({ length: count }, (_, i) => {
        const fecha = new Date();
        // Restamos 'i' horas a cada uno para asegurar un orden cronológico claro para el FIFO
        fecha.setHours(fecha.getHours() - (i + 1));

        // Si queremos que los kilos también varíen un poco entre registros bulk
        const randomKilos = Math.floor(Math.random() * (150 - 50 + 1)) + 50;

        return createMockInventarioActualDescarte({
            fechaIngreso: fecha,
            kilosIniciales: randomKilos,
            kilosActuales: randomKilos,
            canastillasIniciales: Math.ceil(randomKilos / 20),
            canastillasActuales: Math.ceil(randomKilos / 20),
            ...baseOverrides
        });
    });
};
