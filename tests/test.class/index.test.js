require('dotenv').config({ path: '../../.env' });

const { initMongoDB } = require("../../DB/mongoDB/config/init");
const { test_post_clientes, test_get_clientes, test_put_clientes } = require('./Clientes.test');
const { test_post_fruta_descompuesta, test_get_fruta_descompuesta, test_put_fruta_descompuesta, test_delete_fruta_descompuesta } = require("./frutaDescompuesta.test");
const { test_post_indicador, test_get_indicadores, test_put_indicador } = require('./Indicadores.test');
const { test_post_proveedores, test_get_proveedores, test_put_predios } = require('./Proveedores.test');


(
    async () => {
        const chalk = (await import('chalk')).default;
        let procesoDB, sistemaDb;

        try {
            [procesoDB, sistemaDb] = await initMongoDB()
            console.log(chalk.blue.bold('Iniciando prueba...'));


            //#region clientes
            const id_clientes = await test_post_clientes();
            await test_get_clientes(id_clientes.toString());
            await test_put_clientes(id_clientes.toString());

            //#region fruta descompuesta
            const _id = await test_post_fruta_descompuesta();
            await test_get_fruta_descompuesta(_id.toString());
            await test_put_fruta_descompuesta(_id.toString());
            await test_delete_fruta_descompuesta(_id.toString());

            //test indicadores
            const _id_indicadores = await test_post_indicador();
            await test_get_indicadores(_id_indicadores.toString());
            await test_put_indicador(_id_indicadores.toString());

            //test proveedores
            const _id_proveedores = await test_post_proveedores();
            await test_get_proveedores(_id_proveedores.toString());
            await test_put_predios(_id_proveedores.toString());
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
