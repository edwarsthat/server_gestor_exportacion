require('dotenv').config();
const { Client } = require('pg');


const connectPostgresDB = () => {
    const client = new Client({
        host: "localhost",
        port: 5432,
        user: "Edwar",
        password: "calidadstopyse",
        database: "users"
    });
    client.connect(err => {
        if (err) {
            console.error("Error de conexión", err.stack);
        } else {
            console.log("Conectado a PostgreSQL");
        }
    });

    return client

}

module.exports.connectPostgresDB = connectPostgresDB;
