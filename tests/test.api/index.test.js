require('dotenv').config({ path: '../../.env' });

const { initMongoDB } = require("../../DB/mongoDB/config/init");


(
    async () => {
        const chalk = (await import('chalk')).default;
        let procesoDB, sistemaDb;

        try {
            [procesoDB, sistemaDb] = await initMongoDB()

            console.log(chalk.blue.bold('Iniciando prueba...'));


            console.log(chalk.green('Todas las pruebas PASARON correctamente.'));

        } catch (error) {
            console.log(chalk.red('Hubo errores en las pruebas.'), error);
        } finally {
            // Cerrar conexiones
            if (procesoDB) {
                await procesoDB.close();
                console.log(chalk.yellow('Conexión a procesoDB cerrada.'));
            }
            if (sistemaDb) {
                await sistemaDb.close();
                console.log(chalk.yellow('Conexión a sistemaDb cerrada.'));
            }

            // Finalizar el script
            process.exit(0); // Cierra el proceso Node.js
        }
    })();
