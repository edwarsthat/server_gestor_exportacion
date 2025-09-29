import 'dotenv/config';

export default {
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || '0.0.0.0',
    MONGO_PORT: process.env.MONGO_PORT || "27017",
    MONGODB_PROCESO: process.env.MONGODB_PROCESO,
    MONGODB_SISTEMA: process.env.MONGODB_SISTEMA,
    MONGODB_CATALOGOS: process.env.MONGODB_CATALOGOS,
    ACCES_TOKEN: process.env.ACCES_TOKEN,
    REFRESH_TOKEN: process.env.REFRESH_TOKEN,
    SALT_ROUNDS: process.env.SALT_ROUNDS,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    AES_SECRET: process.env.AES_SECRET,
    USUARIO_PRUEBA: process.env.USUARIO_PRUEBA,
    PASSWORD_PRUEBA: process.env.PASSWORD_PRUEBA,
    EMAIL: process.env.EMAIL,
    PASSWORD_EMAIL: process.env.PASSWORD_EMAIL,
    TEST_TOKEN: process.env.TEST_TOKEN,
    INVENTARIO_FRUTA_SIN_PROCESAR: process.env.INVENTARIO_FRUTA_SIN_PROCESAR,
    INVENTARIO_ORDEN_VACEO: process.env.INVENTARIO_ORDEN_VACEO
};
