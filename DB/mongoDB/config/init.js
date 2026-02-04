
import config from '../../../src/config/index.js';
const { MONGODB_SISTEMA } = config;
import { exec } from 'child_process';
import mongoose from 'mongoose';

import { connectCatalogosDB, connectProcesoDB, connectSistemaDB } from './config.js';
import { defineCargo } from '../schemas/usuarios/schemaCargos.js';
import { defineUser } from '../schemas/usuarios/schemaUsuarios.js';
import { defineFrutaDescompuesta } from '../schemas/frutaDescompuesta/schemaFrutaDecompuesta.js';
import { defineRecordcargo } from '../schemas/usuarios/schemaRecordCargos.js';
import { defineRecordusuario } from '../schemas/usuarios/schemaRecordUsuarios.js';
import { defineControlPlagas } from '../schemas/calidad/schemaControlPlagas.js';
import { defineHigienePersonal } from '../schemas/calidad/schemaHigienePersonal.js';
import { defineLimpiezaDiaria } from '../schemas/calidad/schemaLimpiezaDiaria.js';
import { defineLimpiezaMensual } from '../schemas/calidad/schemaLimpiezaMensual.js';
import { defineVolanteCalidad } from '../schemas/calidad/schemaVolanteCalidad.js';
import { defineClientes } from '../schemas/clientes/schemaClientes.js';
import { defineRecordClientes } from '../schemas/clientes/schemaRecordClientes.js';
import { defineproveedores } from '../schemas/proveedores/schemaProveedores.js';
import { defineLotes } from '../schemas/lotes/schemaLotes.js';
import { defineContenedores } from '../schemas/contenedores/schemaContenedores.js';
import { defineRecordContenedores } from '../schemas/contenedores/schemaRecordContenedores.js';
import { defineErrores } from '../schemas/errors/schemaErrores.js';
import { defineRecordTipoInsumos } from '../schemas/insumos/RecordSchemaInsumos.js';
import { defineInsumos } from '../schemas/insumos/schemaInsumos.js';
import { defineHistorialDescarte } from '../schemas/lotes/schemaHistorialDescarte.js';
import { defineHistorialDespachoDescarte } from '../schemas/lotes/schemaHistorialDespachosDescartes.js';
import { defineTurnoData } from '../schemas/proceso/TurnoData.js';
import { defineRecordProveedor } from '../schemas/proveedores/schemaRecordProveedores.js';
import { defineIndicadores } from '../schemas/indicadores/schemaIndicadoresProceso.js';
import { definePrecios } from '../schemas/precios/schemaPrecios.js';
import { defineModificarElemento } from '../schemas/transaccionesRecord/ModificacionesRecord.js';
import { defineCrearElemento } from '../schemas/transaccionesRecord/AddsRecord.js';
import { defineDeleteRecords } from '../schemas/transaccionesRecord/DeleteRecord.js';
import { defineRegistroCanastillas } from '../schemas/canastillas/canastillasRegistrosSchema.js';
import { defineClientesNacionales } from '../schemas/clientes/schemaClientesNacionales.js';
import { defineAuditLogs } from '../schemas/audit/AuditLogSchema.js';
import { defineCuartosdesverdizado } from '../schemas/catalogs/schemaCuartosDesverdizado.js';
import { defineAuditSistemaLogs } from '../schemas/audit/AuditLosSistemaSchema.js';
import { defineInventarioDescarte } from '../schemas/inventarios/SchemaInventarioDescartes.js';
import { defineTipoFrutas } from '../schemas/catalogs/schemaTipoFruta.js';
import { defineLoteEf8 } from '../schemas/lotes/schemaLoteEf8.js';
import { defineSeriales } from '../schemas/seriales/SerialesSchema.js';
import { defineAuditLogsLoteEF8 } from '../schemas/lotes/schemaAuditLoteEf8.js';
import { defineCuartosFrios } from '../schemas/catalogs/schemaCuartosFrios.js';
import { defineAuditCuartosFrios } from '../schemas/audit/AuditCuartosFrios.js';
import { defineAuditInventariosSimples } from '../schemas/audit/AuditInventariosSimples.js';
import { defineInventarioSimple } from '../schemas/inventarios/SchemaInventariosSimples.js';
import { defineVehiculoSalida } from '../schemas/transporte/schemaVehiculoSalida.js';
import { defineAuditRegistroExportacionVehiculo } from '../schemas/audit/AuditReistroSalidaVehiculosExportacion.js';
import { definePallet } from '../schemas/contenedores/schemaPallet.js';
import { defineCalidades } from '../schemas/catalogs/schemaCalidades.js';
import { defineItemPallet } from '../schemas/contenedores/schemaItemsPallet.js';
import { defineAuditLogContenedores } from '../schemas/audit/AuditLogsContenedores.js';
import { defineDescartes } from '../schemas/catalogs/schemaDescartes.js';
import { defineAuditLoteMaquila } from '../schemas/audit/AuditLogLoteMaquila.js';
import { defineLoteMaquila } from '../schemas/lotes/schemaLoteMaquila.js';
import { defineFrutaProcesada } from '../schemas/lotes/schemaFrutaProcesada.js';
import { defineInventarioActualDescarte } from '../schemas/inventarios/SchemaInventarioActualDescarte.js';
import { defineInventarioMovimientosDescarte } from '../schemas/inventarios/SchemaMovimientoInventarioDescartes.js';
import { defineHabilitarEstancias } from '../schemas/proceso/HabilitarEstanciasSchema.js';
import { defineSchemaPersonal } from '../schemas/personal/SchemaPersonal.js';
import { defineSchemaCargosPersonal } from '../schemas/personal/SchemaCargosPersonal.js';
import { defineSchemaAreasFisicas } from '../schemas/catalogs/schemaAreasFisicas.js';
import { defineSchemaCarnets } from '../schemas/personal/dotaciones/SchemaCarnets.js';
import { defineAuditCargosPersonal } from '../schemas/audit/AuditCargosPersonal.js';
import { defineAuditPersonal } from '../schemas/audit/AuditPersonal.js';
//.Jp
import { defineTarifaPredio } from "../schemas/tarifas/schemaTarifasPredio.js";

export const db = {};
export const connections = {};


const checkMongoDBRunning = async () => {
    try {
        console.log("🧪 Probando conexión con MongoDB...");

        const db = mongoose.createConnection(MONGODB_SISTEMA, {
            serverSelectionTimeoutMS: 2000, // Tiempo máximo de espera
        });

        // Esperamos a que se conecte, para evitar mentirle al usuario
        await db.asPromise();
        console.log("✅ MongoDB respondió. Está vivito y coleando.");

        await db.close(); // Cerramos porque somos civilizados
        return true;
    } catch (error) {
        console.log("❌ No se pudo establecer conexión con MongoDB.");
        console.error(`🔍 Detalle del error: ${error.message || "Sin mensaje. Aún más misterioso."}`);
        return false;
    }
};

/**
 * Intenta iniciar el servicio de MongoDB ejecutando el comando `mongod` en el puerto 27017.
 *
 * Utiliza el módulo `child_process` para lanzar el proceso y retorna una promesa que se resuelve o rechaza según el resultado.
 *
 * @function startMongoDB
 * @memberof module:DB/mongoDB/config/init
 * @returns {Promise<string>} Promesa que se resuelve con el mensaje de inicio o se rechaza con el error correspondiente.
 */
const startMongoDB = () => {
    return new Promise((resolve, reject) => {
        exec("mongod --port 27017", (error, stdout, stderr) => {
            if (error) {
                reject(`Error al iniciar MongoDB: ${error}`);
            } else if (stderr) {
                reject(`Error de MongoDB: ${stderr}`);
            } else {
                resolve(`MongoDB iniciado: ${stdout}`);
            }
        });
    });
};

/**
 * Espera de forma activa hasta que el servicio de MongoDB esté listo para aceptar conexiones.
 *
 * Llama periódicamente a `checkMongoDBRunning` cada segundo hasta que la base de datos responda.
 *
 * @function waitForMongoDB
 * @memberof module:DB/mongoDB/config/init
 * @returns {Promise<void>} Promesa que se resuelve cuando MongoDB está listo.
 */
const waitForMongoDB = () => {
    return new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
            const isRunning = await checkMongoDBRunning();
            if (isRunning) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 1000);
    });
};

/**
 * Inicializa la conexión a MongoDB, verifica el estado del servicio, lo arranca si es necesario,
 * y define todos los esquemas de la base de datos para el sistema y los procesos.
 *
 * @async
 * @function initMongoDB
 * @memberof module:DB/mongoDB/config/init
 * @returns {Promise<Array>} Retorna un array con las conexiones a las bases de datos [procesoDB, sistemaDb].
 *
 * @example
 * // Inicializar MongoDB y obtener las conexiones
 * const [procesoDB, sistemaDb] = await initMongoDB();
 */
export async function initMongoDB() {
    try {
        console.log("🔍 Verificando estado de MongoDB...");

        const isMongoDBRunning = await checkMongoDBRunning();
        console.log(`⚙️  MongoDB en ejecución: ${isMongoDBRunning ? "✅ Sí" : "❌ No"}`);

        if (!isMongoDBRunning) {
            console.log("🚫 MongoDB no está activo.");
            console.log("🛠️  Intentando iniciar MongoDB...");
            await startMongoDB();
            console.log("⏳ Esperando a que MongoDB esté listo para recibir conexiones...");
            await waitForMongoDB();
        }

        console.log("🔗 Iniciando conexión a las bases de datos...");

        const procesoDB = await connectProcesoDB();
        const sistemaDb = await connectSistemaDB();
        const catalogosDB = await connectCatalogosDB();

        console.log("🧬 Definiendo esquemas para cada base de datos...");
        await defineSchemasSistema(sistemaDb);
        console.log("📦 Esquemas definidos para *Sistema*.");

        await defineSchemasProceso(procesoDB);
        console.log("📦 Esquemas definidos para *Proceso*.");

        await defineSchemasCatalogo(catalogosDB);
        console.log("🎉 Conexiones establecidas con éxito. MongoDB está listo para causar caos (o al menos guardar datos).");

        return [procesoDB, sistemaDb];

    } catch (error) {
        console.error("💥 Error durante la inicialización de MongoDB:");
        console.error(error);
        console.log("💀 Y así termina otra gloriosa sesión de inicialización fallida.");
    }
};

/**
 * @typedef {Object} MongooseConnection
 * @see https://mongoosejs.com/docs/api/connection.html
 */

/**
 * Registra y define todos los esquemas de Mongoose para la base de datos de procesos.
 *
 * @async
 * @function defineSchemasProceso
 * @memberof module:DB/mongoDB/config/init
 * @param {Object} sysConn - Conexión activa a la base de datos de procesos (Mongoose Connection).
 * @returns {Promise<void>} Promesa que se resuelve cuando todos los esquemas han sido definidos.
 *
 * @throws {Error} Si ocurre un error durante la definición de los esquemas.
 */
const defineSchemasProceso = async (sysConn) => {
    try {
        console.log("🔍 Iniciando definición de schemas proceso...");

        // 1. Primero definimos el esquema de auditoría ya que otros lo necesitan
        //#region Audit
        console.log("⚡ Definiendo AuditLog...");
        const AuditLog = await defineAuditLogs(sysConn)
        db.AuditLog = AuditLog;
        const AuditLoteEF8 = await defineAuditLogsLoteEF8(sysConn);
        const AuditCuartosFrios = await defineAuditCuartosFrios(sysConn);
        db.AuditCuartosFrios = AuditCuartosFrios;
        const AuditInventariosSimples = await defineAuditInventariosSimples(sysConn);
        db.AuditInventariosSimples = AuditInventariosSimples;
        const AuditRegistroExportacionVehiculo = await defineAuditRegistroExportacionVehiculo(sysConn);
        db.AuditRegistroExportacionVehiculo = AuditRegistroExportacionVehiculo;
        const AuditRegistroExportacionContenedor = await defineAuditLogContenedores(sysConn);
        db.AuditRegistroExportacionContenedor = AuditRegistroExportacionContenedor;
        const AuditLotesMaquila = await defineAuditLoteMaquila(sysConn);
        db.AuditLotesMaquila = AuditLotesMaquila;
        const AuditCargosPersonal = await defineAuditCargosPersonal(sysConn);
        db.AuditCargosPersonal = AuditCargosPersonal;
        const AuditPersonal = await defineAuditPersonal(sysConn);
        db.AuditPersonal = AuditPersonal;

        console.log("⚡ Definiendo Cargo...");
        db.Cargo = await defineCargo(sysConn);
        console.log("✅ Cargo definido");

        console.log("⚡ Definiendo recordCargo...");
        db.recordCargo = await defineRecordcargo(sysConn);
        console.log("✅ recordCargo definido");

        console.log("⚡ Definiendo Usuarios...");
        db.Usuarios = await defineUser(sysConn);
        console.log("✅ Usuarios definido");


        console.log("✅ AuditLog definido");
        //#endregion
        //#region Areas fisicas
        // inventarios
        console.log("⚡ Definiendo Cuartos Frios...");
        db.CuartosFrios = await defineCuartosFrios(sysConn, AuditCuartosFrios);
        console.log("✅ Cuartos Frios definidos");
        console.log("⚡ Definiendo Inventarios Simples...");
        db.InventariosSimples = await defineInventarioSimple(sysConn, AuditInventariosSimples);
        console.log("✅ Inventarios Simples definidos");
        db.AreasFisicas = await defineSchemaAreasFisicas(sysConn);
        console.log("✅ Areas Fisicas definidos");
        //#endregion


        // Esquemas relacionados con clientes (base para otras dependencias)
        console.log("⚡ Definiendo Tipo frutas...");
        db.TipoFrutas = await defineTipoFrutas(sysConn);
        console.log("✅ Tipo frutas definidos");
        console.log("⚡ Definiendo Calidades...");
        db.CalidadesExpFruta = await defineCalidades(sysConn);
        console.log("✅ Calidades definidos");
        console.log("⚡ Definiendo descartes...");
        db.Descartes = await defineDescartes(sysConn);
        console.log("✅ Descartes definidos");

        console.log("⚡ Definiendo Clientes...");
        db.Clientes = await defineClientes(sysConn);
        console.log("✅ Clientes definido");

        console.log("⚡ Definiendo ClientesNacionales...");
        db.ClientesNacionales = await defineClientesNacionales(sysConn);
        console.log("✅ ClientesNacionales definido");

        console.log("⚡ Definiendo recordClientes...");
        db.recordClientes = await defineRecordClientes(sysConn);
        console.log("✅ recordClientes definido");

        // Esquemas relacionados con proveedores
        console.log("⚡ Definiendo Proveedores...");
        db.Proveedores = await defineproveedores(sysConn);
        console.log("✅ Proveedores definido");

        //.Jp
        console.log("⚡ Definiendo TarifaPredio...");
        db.TarifaPredio = await defineTarifaPredio(sysConn);
        console.log("✅ TarifaPredio definido");


        console.log("⚡ Definiendo recordProveedor...");
        db.recordProveedor = await defineRecordProveedor(sysConn);
        console.log("✅ recordProveedor definido");

        // Esquemas de descartes (dependen de clientes)
        console.log("⚡ Definiendo historialDespachoDescarte...");
        db.historialDespachoDescarte = await defineHistorialDespachoDescarte(sysConn);
        console.log("✅ historialDespachoDescarte definido");

        console.log("⚡ Definiendo historialDescarte...");
        db.historialDescarte = await defineHistorialDescarte(sysConn);
        console.log("✅ historialDescarte definido");

        console.log("⚡ Definiendo frutaDescompuesta...");
        db.frutaDescompuesta = await defineFrutaDescompuesta(sysConn);
        console.log("✅ frutaDescompuesta definido");

        // Esquemas independientes
        console.log("⚡ Definiendo Precios...");
        db.Precios = await definePrecios(sysConn);
        console.log("✅ Precios definido");

        console.log("⚡ Definiendo VehiculoSalida...");
        db.VehiculoSalida = await defineVehiculoSalida(sysConn, AuditRegistroExportacionVehiculo);
        console.log("✅ VehiculoSalida definido");

        console.log("⚡ Definiendo Insumos...");
        db.Insumos = await defineInsumos(sysConn);
        console.log("✅ Insumos definido");

        console.log("⚡ Definiendo RecordTipoInsumos...");
        db.RecordTipoInsumos = await defineRecordTipoInsumos(sysConn);
        console.log("✅ RecordTipoInsumos definido");

        console.log("⚡ Definiendo TurnoData...");
        db.TurnoData = await defineTurnoData(sysConn);
        console.log("✅ TurnoData definido");

        console.log("⚡ Definiendo Indicadores...");
        db.Indicadores = await defineIndicadores(sysConn);
        console.log("✅ Indicadores definido");

        // Esquemas relacionados con contenedores (dependen de lotes)
        console.log("⚡ Definiendo Contenedores...");
        db.Contenedores = await defineContenedores(sysConn, AuditRegistroExportacionContenedor);
        console.log("✅ Contenedores definido");
        console.log("⚡ Definiendo Pallets...");
        db.Pallet = await definePallet(sysConn, AuditRegistroExportacionContenedor);
        console.log("✅ Pallets definido");
        console.log("⚡ Definiendo itemPallet...");
        db.itemPallet = await defineItemPallet(sysConn, AuditRegistroExportacionContenedor);
        console.log("✅ itemPallet definido");

        console.log("⚡ Definiendo recordContenedores...");
        db.recordContenedores = await defineRecordContenedores(sysConn);
        console.log("✅ recordContenedores definido");        // 7. Esquemas de canastillas
        console.log("⚡ Definiendo RegistrosCanastillas...");
        db.RegistrosCanastillas = await defineRegistroCanastillas(sysConn);
        console.log("✅ RegistrosCanastillas definido");

        // Esquemas relacionados con lotes (dependen de proveedores y descartes)
        console.log("⚡ Definiendo Lotes...");
        db.Lotes = await defineLotes(sysConn, AuditLog);
        console.log("✅ Lotes definido");

        console.log("⚡ Definiendo Lotes maquila...");
        db.LotesMaquila = await defineLoteMaquila(sysConn, AuditLotesMaquila);
        console.log("✅ Lotes maquila definido");

        console.log("⚡ Definiendo frutaProcesada...");
        db.frutaProcesada = await defineFrutaProcesada(sysConn);
        console.log("✅ frutaProcesada definido");

        console.log("⚡ Definiendo Lotes EF8...");
        db.LotesEF8 = await defineLoteEf8(sysConn, AuditLoteEF8);
        console.log("✅ Lotes EF8 definido");

        // Esquemas de registro de transacciones
        console.log("⚡ Definiendo RecordModificacion...");
        db.RecordModificacion = await defineModificarElemento(sysConn);
        console.log("✅ RecordModificacion definido");

        console.log("⚡ Definiendo RecordCreacion...");
        db.RecordCreacion = await defineCrearElemento(sysConn);
        console.log("✅ RecordCreacion definido");

        console.log("⚡ Definiendo RecordDelete...");
        db.RecordDelete = await defineDeleteRecords(sysConn);
        console.log("✅ RecordDelete definido");

        console.log("⚡ Definiendo Inventario descarte...");
        db.InventarioDescarte = await defineInventarioDescarte(sysConn);
        console.log("✅ InventarioDescarte definido");

        console.log("⚡ Definiendo Inventario descarte...");
        db.InventarioActualDescarte = await defineInventarioActualDescarte(sysConn);
        console.log("✅ InventarioActualDescarte definido");

        console.log("⚡ Definiendo Inventario descarte...");
        db.InventarioMovimientoDescarte = await defineInventarioMovimientosDescarte(sysConn);
        console.log("✅ InventarioMovimientoDescarte definido");

        console.log("⚡ Definiendo Seriales...");
        db.Seriales = await defineSeriales(sysConn);
        console.log("✅ Seriales definidos");

        console.log("⚡ Definiendo Habilitar Instancia...");
        db.HabilitarEstancia = await defineHabilitarEstancias(sysConn); //es HabilitarEstancia no HabilitarInstancia
        console.log("✅ Habilitar Instancia definido");

        //#region Personal

        console.log("⚡ Definiendo Cargos Personal...");
        db.CargosPersonal = await defineSchemaCargosPersonal(sysConn, AuditCargosPersonal);
        console.log("✅ Cargos Personal definido");
        console.log("⚡ Definiendo Personal...");
        db.Personal = await defineSchemaPersonal(sysConn, AuditPersonal);
        console.log("✅ Personal definido");
        console.log("⚡ Definiendo Carnets...");
        db.Carnet = await defineSchemaCarnets(sysConn);
        console.log("✅ Carnets definido");
        //#endregion

        console.log("🎉 Todos los schemas de proceso han sido definidos correctamente.")

    } catch (error) {
        console.error("Error durante la inicialización de MongoDB: creando los schemas", error);
    }
}

/**
 * Registra y define todos los esquemas de Mongoose para la base de datos de catalogos.
 *
 * @async
 * @function defineSchemasSistema
 * @memberof module:DB/mongoDB/config/init
 * @param {Object} sysConn - Conexión activa a la base de datos del sistema (Mongoose Connection).
 * @returns {Promise<void>} Promesa que se resuelve cuando todos los esquemas han sido definidos.
 *
 * @throws {Error} Si ocurre un error durante la definición de los esquemas.
 */
const defineSchemasSistema = async (sysConn) => {
    try {
        console.log("🔍 Iniciando definición de schemas sistema...");

        // console.log("⚡ Definiendo Cargo...");
        // db.Cargo = await defineCargo(sysConn);
        // console.log("✅ Cargo definido");

        console.log("⚡ Definiendo recordCargo...");
        db.recordCargo = await defineRecordcargo(sysConn);
        console.log("✅ recordCargo definido");

        console.log("⚡ Definiendo Usuarios...");
        db.Usuarios = await defineUser(sysConn);
        console.log("✅ Usuarios definido");


        console.log("⚡ Definiendo Logs...");
        db.Logs = await defineAuditSistemaLogs(sysConn);
        console.log("✅ Logs definido");


        console.log("⚡ Definiendo recordUsuario...");
        db.recordUsuario = await defineRecordusuario(sysConn);
        console.log("✅ recordUsuario definido");

        console.log("⚡ Definiendo ControlPlagas...");
        db.ControlPlagas = await defineControlPlagas(sysConn);
        console.log("✅ ControlPlagas definido");

        console.log("⚡ Definiendo HigienePersonal...");
        db.HigienePersonal = await defineHigienePersonal(sysConn);
        console.log("✅ HigienePersonal definido");

        console.log("⚡ Definiendo LimpiezaDiaria...");
        db.LimpiezaDiaria = await defineLimpiezaDiaria(sysConn);
        console.log("✅ LimpiezaDiaria definido");

        console.log("⚡ Definiendo LimpiezaMensual...");
        db.LimpiezaMensual = await defineLimpiezaMensual(sysConn);
        console.log("✅ LimpiezaMensual definido");

        console.log("⚡ Definiendo VolanteCalidad...");
        db.VolanteCalidad = await defineVolanteCalidad(sysConn);
        console.log("✅ VolanteCalidad definido");

        console.log("⚡ Definiendo Errores...");
        db.Errores = await defineErrores(sysConn);
        console.log("✅ Errores definido");

        console.log("🎉 Todos los schemas de sistema han sido definidos correctamente.");

    } catch (error) {
        console.error("Error durante la inicialización de MongoDB: creando los schemas", error);
    }
}

/**
 * Registra y define todos los esquemas de Mongoose para la base de datos del sistema.
 *
 * @async
 * @function defineSchemasSistema
 * @memberof module:DB/mongoDB/config/init
 * @param {Object} sysConn - Conexión activa a la base de datos del sistema (Mongoose Connection).
 * @returns {Promise<void>} Promesa que se resuelve cuando todos los esquemas han sido definidos.
 *
 * @throws {Error} Si ocurre un error durante la definición de los esquemas.
 */
const defineSchemasCatalogo = async (sysConn) => {
    try {
        try {
            console.log("🔍 Iniciando definición de schemas sistema...");

            console.log("⚡ Definiendo Cuartos desverdizado...");
            db.CuartosDesverdizados = await defineCuartosdesverdizado(sysConn);
            console.log("✅ Cuartos desverdizados definidos");

            console.log("🎉 Todos los schemas de sistema han sido definidos correctamente.");

        } catch (error) {
            console.error("Error durante la inicialización de MongoDB: creando los schemas", error);
        }

    } catch (error) {
        console.error("Error durante la inicialización de MongoDB: creando los schemas", error);
    }
}

