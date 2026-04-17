import 'dotenv/config';
import { INVENTARIOS_IDS } from '../constants/inventarios.js';
import { PREDIOS_IDS } from '../constants/predios.js';
import { CLIENTES_IDS } from '../constants/clientes.js';
import { CARGOS_IDS } from '../constants/cargos.js';

function require(name) {
    const value = process.env[name];
    if (!value) throw new Error(`Variable de entorno requerida no definida: ${name}`);
    return value;
}

export default {
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || '0.0.0.0',
    MONGO_PORT: process.env.MONGO_PORT || "27017",
    MONGODB_PROCESO: require("MONGODB_PROCESO"),
    MONGODB_SISTEMA: require("MONGODB_SISTEMA"),
    MONGODB_CATALOGOS: require("MONGODB_CATALOGOS"),
    ACCES_TOKEN: require("ACCES_TOKEN"),
    REFRESH_TOKEN: require("REFRESH_TOKEN"),
    SALT_ROUNDS: process.env.SALT_ROUNDS || 10,
    USUARIO_PRUEBA: require("USUARIO_PRUEBA"),
    PASSWORD_PRUEBA: require("PASSWORD_PRUEBA"),
    EMAIL: require("EMAIL"),
    PASSWORD_EMAIL: require("PASSWORD_EMAIL"),
    TEST_TOKEN: require("TEST_TOKEN"),
    INVENTARIO_FRUTA_SIN_PROCESAR: INVENTARIOS_IDS.INVENTARIO_FRUTA_SIN_PROCESAR,
    INVENTARIO_ORDEN_VACEO: INVENTARIOS_IDS.INVENTARIO_ORDEN_VACEO,
    INVENTARIO_CANASTILLAS: INVENTARIOS_IDS.INVENTARIO_CANASTILLAS,
    ID_CELIFRUT: PREDIOS_IDS.ID_CELIFRUT,
    ENCRYPTION_KEY: require("ENCRYPTION_KEY"),
    URL_CELIFRUT: process.env.URL_CELIFRUT || "https://www.celifrut.com",
    DIR_OPERACIONES: CARGOS_IDS.DIR_OPERACIONES,
    COORDINADOR_PRODUCCION: CARGOS_IDS.COORDINADOR_PRODUCCION,
    CLIENTE_PROACOL: CLIENTES_IDS.CLIENTE_PROACOL,
    CLIENTE_KONGELATO: CLIENTES_IDS.CLIENTE_KONGELATO,
    API_KEY_SP32: require("API_KEY_SP32"),
};
