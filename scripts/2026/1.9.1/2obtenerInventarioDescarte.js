
import fs from 'fs';
import { MongoClient, ObjectId } from 'mongodb';
import config from '../../../src/config/index.js';

const { MONGODB_PROCESO, MONGODB_SISTEMA } = config;

let client = null;
let clientSis = null;
let db = null;
let sisDb = null;

async function connectProcesoDB() {
    try {
        if (db) {
            console.log('✅ Ya existe una conexión activa a la base de datos proceso');
            return db;
        }

        console.log('🔌 Conectando a la base de datos proceso...');

        // Crear cliente de MongoDB
        client = new MongoClient(MONGODB_PROCESO, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        // Conectar al servidor
        await client.connect();

        // Verificar la conexión
        await client.db().admin().ping();
        console.log('✅ Conectado exitosamente a la base de datos proceso');

        // Obtener la base de datos
        db = client.db();

        return db;
    } catch (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        throw error;
    }
}

async function connectServicioDB() {
    try {
        if (sisDb) {
            console.log('✅ Ya existe una conexión activa a la base de datos sistema');
            return sisDb;
        }

        console.log('🔌 Conectando a la base de datos sistema...');

        // Crear cliente de MongoDB
        clientSis = new MongoClient(MONGODB_SISTEMA, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        // Conectar al servidor
        await clientSis.connect();

        // Verificar la conexión
        await clientSis.db().admin().ping();
        console.log('✅ Conectado exitosamente a la base de datos sistema');

        // Obtener la base de datos
        sisDb = clientSis.db();

        return sisDb;
    } catch (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        throw error;
    }
}

async function closeConnection() {
    try {
        if (client) {
            await client.close();
            client = null;
            db = null;
            console.log('🔌 Conexión cerrada correctamente');
        }
    } catch (error) {
        console.error('❌ Error cerrando la conexión:', error.message);
        throw error;
    }
}

async function closeConnectionSis() {
    try {
        if (clientSis) {
            await clientSis.close();
            clientSis = null;
            sisDb = null;
            console.log('🔌 Conexión cerrada correctamente');
        }
    } catch (error) {
        console.error('❌ Error cerrando la conexión:', error.message);
        throw error;
    }
}

async function main() {
    try {
        // Conectar a la base de datos
        const database = await connectProcesoDB();
        const sisDatabase = await connectServicioDB();

        // Obtener colecciones (MongoDB pluraliza automáticamente los nombres de modelo)
        const auditSistemaCollection = sisDatabase.collection('auditsistemlogs');

        const inventarioActualDescarteCollection = database.collection('inventarioactualdescartes');

        const registrosDescarte = await inventarioActualDescarteCollection
            .aggregate([
                {
                    $match: {
                        fechaIngreso: {
                            $gte: new Date(new Date().getFullYear(), 0, 1),
                            $lt: new Date(new Date().getFullYear() + 1, 0, 1)
                        }
                    }
                },

                // 🔗 Lookup Lotes
                {
                    $lookup: {
                        from: "lotes",
                        localField: "lote",
                        foreignField: "_id",
                        as: "loteInfo"
                    }
                },
                {
                    $unwind: {
                        path: "$loteInfo",
                        preserveNullAndEmptyArrays: true
                    }
                },

                // 🔗 Lookup Descartes
                {
                    $lookup: {
                        from: "descartes",
                        localField: "tipoDescarte",
                        foreignField: "_id",
                        as: "descarteInfo"
                    }
                },

                {
                    $unwind: {
                        path: "$descarteInfo",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "tipofrutas",
                        localField: "tipoFruta",
                        foreignField: "_id",
                        as: "tipoFrutaInfo"
                    }
                },
                {
                    $unwind: {
                        path: "$tipoFrutaInfo",
                        preserveNullAndEmptyArrays: true
                    }
                },

                // ✨ Transformación final
                {
                    $addFields: {
                        lote: "$loteInfo.enf",
                        tipoDescarte: "$descarteInfo.descripcion",
                        tipoFruta: "$tipoFrutaInfo.tipoFruta"
                    }
                },

                // 🧹 Limpieza
                {
                    $project: {
                        loteInfo: 0,
                        descarteInfo: 0,
                        tipoFrutaInfo: 0
                    }
                }
            ])
            .toArray();

        const ids_registros_udits = registrosDescarte.map(item => item.user);
        const setIdsRegistros = new Set(ids_registros_udits);
        const arrIdsRegistros = Array.from(setIdsRegistros);


        const registrosAudit = await auditSistemaCollection
            .find({
                _id: {
                    $in: arrIdsRegistros
                }
            })
            .toArray();

        // Obtener usuarios (DB Proceso)
        const userColl = database.collection('usuarios');
        const userIds = registrosAudit.map(r => r.user).filter(id => id);
        const uniqueUserIds = [...new Set(userIds.map(id => id.toString()))].map(id => new ObjectId(id));

        const users = await userColl.find({ _id: { $in: uniqueUserIds } }).toArray();

        const usersMap = new Map(users.map(u => [u._id.toString(), u]));
        const auditMap = new Map(registrosAudit.map(a => [a._id.toString(), a]));

        const salida = registrosDescarte.map(registro => {
            const auditLog = auditMap.get(registro.user?.toString());
            const user = auditLog && auditLog.user ? usersMap.get(auditLog.user.toString()) : null;

            return {
                lote: registro.lote,
                tipoFruta: registro.tipoFruta,
                area: registro.area, // Asumiendo que existe en el doc original
                tipoDescarte: registro.tipoDescarte,
                kilosIniciales: registro.kilosIniciales,
                fechaIngreso: registro.fechaIngreso,

                action: auditLog?.action || '',
                timestamp: auditLog?.timestamp || '',

                usuario: user?.usuario || '',
                nombre: user?.nombre || '',
                apellido: user?.apellido || ''
            };
        });

        console.log("Registros procesados:", salida.length);
        if (salida.length > 0) console.log("Ejemplo:", salida[0]);

        // --- Generar CSV ---
        const headers = [
            'Lote', 'Tipo Fruta', 'Area', 'Tipo Descarte', 'Kilos Iniciales', 'Fecha Ingreso',
            'Action', 'Timestamp', 'Usuario', 'Nombre', 'Apellido'
        ];

        const csvRows = salida.map(row => {
            return [
                row.lote,
                row.tipoFruta,
                row.area,
                row.tipoDescarte,
                row.kilosIniciales,
                row.fechaIngreso ? new Date(row.fechaIngreso).toISOString() : '',
                row.action,
                row.timestamp ? new Date(row.timestamp).toISOString() : '',
                row.usuario,
                row.nombre,
                row.apellido
            ].map(val => {
                const str = String(val === undefined || val === null ? '' : val);
                return `"${str.replace(/"/g, '""')}"`;
            }).join(',');
        });

        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const fileName = 'registros_audit_descarte.csv';

        fs.writeFileSync(fileName, csvContent, 'utf8');
        console.log(`✅ Archivo exportado: ${fileName}`);

    } catch (error) {
        console.error('❌ Error en el proceso:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        // Cerrar la conexión al finalizar
        await closeConnection();
        await closeConnectionSis();
    }
}

// Ejecutar el script
main();