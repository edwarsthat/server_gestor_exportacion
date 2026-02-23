import 'dotenv/config';

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
    INVENTARIO_FRUTA_SIN_PROCESAR: process.env.INVENTARIO_FRUTA_SIN_PROCESAR || "68cecc4cff82bb2930e43d05",
    INVENTARIO_ORDEN_VACEO: process.env.INVENTARIO_ORDEN_VACEO || "68d1c0410f282bcb84388dd3",
    ID_CELIFRUT: process.env.ID_CELIFRUT || "65c27f3870dd4b7f03ed9857",
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "encryption_key",
    URL_CELIFRUT: process.env.URL_CELIFRUT || "https://www.celifrut.com",
    DIR_OPERACIONES: process.env.DIR_OPERACIONES || "",
    COORDINADOR_PRODUCCION: process.env.COORDINADOR_PRODUCCION || "",
    CLIENTE_PROACOL: process.env.CLIENTE_PROACOL || "68b87bb095a45e4b46698c05"
};
