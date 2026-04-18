import 'dotenv/config';
import { INVENTARIOS_IDS } from '../constants/inventarios.js';
import { PREDIOS_IDS } from '../constants/predios.js';
import { CLIENTES_IDS } from '../constants/clientes.js';
import { CARGOS_IDS } from '../constants/cargos.js';

export default {
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || '0.0.0.0',
    MONGO_PORT: process.env.MONGO_PORT || "27017",
    MONGODB_PROCESO: process.env.MONGODB_PROCESO || "mongodb://localhost:27017/proceso?replicaSet=rs0",
    MONGODB_SISTEMA: process.env.MONGODB_SISTEMA || "mongodb://localhost:27017/sistema?replicaSet=rs0",
    MONGODB_CATALOGOS: process.env.MONGODB_CATALOGOS || "mongodb://localhost:27017/catalogos?replicaSet=rs0",
    ACCES_TOKEN: process.env.ACCES_TOKEN || "access_token_secret",
    REFRESH_TOKEN: process.env.REFRESH_TOKEN || "refresh_token_secret",
    SALT_ROUNDS: process.env.SALT_ROUNDS || 10,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || "github_token",
    AES_SECRET: process.env.AES_SECRET || "aes_secret",
    USUARIO_PRUEBA: process.env.USUARIO_PRUEBA || "pruebasautomatizadas",
    PASSWORD_PRUEBA: process.env.PASSWORD_PRUEBA || "password_prueba",
    EMAIL: process.env.EMAIL || "correoEnvio@gmail.com",
    PASSWORD_EMAIL: process.env.PASSWORD_EMAIL || "password_email",
    TEST_TOKEN: process.env.TEST_TOKEN || "test_token",
    INVENTARIO_FRUTA_SIN_PROCESAR: INVENTARIOS_IDS.INVENTARIO_FRUTA_SIN_PROCESAR,
    INVENTARIO_ORDEN_VACEO: INVENTARIOS_IDS.INVENTARIO_ORDEN_VACEO,
    INVENTARIO_CANASTILLAS: INVENTARIOS_IDS.INVENTARIO_CANASTILLAS,
    ID_CELIFRUT: PREDIOS_IDS.ID_CELIFRUT,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "encryption_key",
    URL_CELIFRUT: process.env.URL_CELIFRUT || "https://www.celifrut.com",
    DIR_OPERACIONES: CARGOS_IDS.DIR_OPERACIONES,
    COORDINADOR_PRODUCCION: CARGOS_IDS.COORDINADOR_PRODUCCION,
    CLIENTE_PROACOL: CLIENTES_IDS.CLIENTE_PROACOL,
    CLIENTE_KONGELATO: CLIENTES_IDS.CLIENTE_KONGELATO,
    API_KEY_SP32: process.env.API_KEY_SP32 || "api_key_sp32"
};
