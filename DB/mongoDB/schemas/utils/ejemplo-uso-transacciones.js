/**
 * Ejemplo de uso de los middlewares de auditoría con sesiones de MongoDB para transacciones
 */

import mongoose from 'mongoose';

// Ejemplo 1: Uso con save() - Nivel de documento
async function ejemploSaveConTransaccion(Model, data, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const doc = new Model(data);
        
        // Pasar información de auditoría y sesión a través de $locals
        doc.$locals = {
            $audit: {
                user: userId,
                action: 'crear-registro',
                description: 'Creación de nuevo registro',
                session // Pasar la sesión aquí
            }
        };

        await doc.save({ session }); // Pasar session a save

        await session.commitTransaction();
        console.log('Transacción completada exitosamente');
        return doc;
    } catch (error) {
        await session.abortTransaction();
        console.error('Error en transacción, revertida:', error);
        throw error;
    } finally {
        session.endSession();
    }
}

// Ejemplo 2: Uso con findOneAndUpdate() - Nivel de query
async function ejemploFindOneAndUpdateConTransaccion(Model, query, update, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const resultado = await Model.findOneAndUpdate(
            query,
            update,
            {
                new: true,
                session, // Pasar sesión aquí
                user: userId,
                action: 'actualizar-registro',
                description: 'Actualización de registro existente'
            }
        );

        await session.commitTransaction();
        console.log('Transacción completada exitosamente');
        return resultado;
    } catch (error) {
        await session.abortTransaction();
        console.error('Error en transacción, revertida:', error);
        throw error;
    } finally {
        session.endSession();
    }
}

// Ejemplo 3: Uso con updateOne/updateMany - Nivel de query
async function ejemploUpdateManyConTransaccion(Model, query, update, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const resultado = await Model.updateMany(
            query,
            update,
            {
                session, // Pasar sesión aquí
                $audit: {
                    user: userId,
                    action: 'actualización-masiva',
                    description: 'Actualización de múltiples registros'
                }
            }
        );

        await session.commitTransaction();
        console.log('Transacción completada exitosamente');
        return resultado;
    } catch (error) {
        await session.abortTransaction();
        console.error('Error en transacción, revertida:', error);
        throw error;
    } finally {
        session.endSession();
    }
}

// Ejemplo 4: Uso con deleteOne() - Nivel de documento
async function ejemploDeleteOneConTransaccion(Model, id, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const doc = await Model.findById(id);
        if (!doc) {
            throw new Error('Documento no encontrado');
        }

        // Configurar auditoría con sesión
        doc.$locals = {
            $audit: {
                user: userId,
                action: 'eliminar-registro',
                description: 'Eliminación de registro',
                session // Pasar la sesión aquí
            }
        };

        await doc.deleteOne({ session });

        await session.commitTransaction();
        console.log('Transacción completada exitosamente');
    } catch (error) {
        await session.abortTransaction();
        console.error('Error en transacción, revertida:', error);
        throw error;
    } finally {
        session.endSession();
    }
}

// Ejemplo 5: Uso con deleteMany() - Nivel de query
async function ejemploDeleteManyConTransaccion(Model, query, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const resultado = await Model.deleteMany(query, {
            session,
            user: userId
        });

        await session.commitTransaction();
        console.log('Transacción completada exitosamente');
        return resultado;
    } catch (error) {
        await session.abortTransaction();
        console.error('Error en transacción, revertida:', error);
        throw error;
    } finally {
        session.endSession();
    }
}

// Ejemplo 6: Uso con insertMany() - Operación masiva
async function ejemploInsertManyConTransaccion(Model, documents) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // insertMany requiere que los documentos y la sesión se pasen como argumentos separados
        const resultado = await Model.insertMany(documents, { session });

        await session.commitTransaction();
        console.log('Transacción completada exitosamente');
        return resultado;
    } catch (error) {
        await session.abortTransaction();
        console.error('Error en transacción, revertida:', error);
        throw error;
    } finally {
        session.endSession();
    }
}

// Ejemplo 7: Transacción compleja con múltiples operaciones
async function ejemploTransaccionCompleja(Model1, Model2, data1, data2, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Operación 1: Crear en Model1
        const doc1 = new Model1(data1);
        doc1.$locals = {
            $audit: {
                user: userId,
                action: 'crear-entidad-1',
                description: 'Creación en modelo 1',
                session
            }
        };
        await doc1.save({ session });

        // Operación 2: Actualizar en Model2
        await Model2.findOneAndUpdate(
            { _id: data2.id },
            { $set: data2.update },
            {
                session,
                user: userId,
                action: 'actualizar-entidad-2',
                description: 'Actualización en modelo 2'
            }
        );

        // Si todo sale bien, confirmar transacción
        await session.commitTransaction();
        console.log('Transacción compleja completada exitosamente');
        return { doc1 };
    } catch (error) {
        // Si algo falla, revertir todo
        await session.abortTransaction();
        console.error('Error en transacción compleja, todo revertido:', error);
        throw error;
    } finally {
        session.endSession();
    }
}

export {
    ejemploSaveConTransaccion,
    ejemploFindOneAndUpdateConTransaccion,
    ejemploUpdateManyConTransaccion,
    ejemploDeleteOneConTransaccion,
    ejemploDeleteManyConTransaccion,
    ejemploInsertManyConTransaccion,
    ejemploTransaccionCompleja
};
