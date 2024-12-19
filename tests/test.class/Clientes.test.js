const assert = require('assert')
const { isValidObjectId } = require('mongoose');
const { ClientesRepository } = require('../../server/Class/Clientes');

const test_post_clientes = async () => {

    const chalk = (await import('chalk')).default;
    console.log(chalk.blue.bold('Iniciando prueba: post_cliente'));

    try {
        const mockData = {
            CLIENTE: "test Cliente",
            PAIS_DESTINO: ["Estados unidos", "Europa"],
            CODIGO: 99999,
            CORREO: "test@node.com",
            DIRECCIÓN: "Barrio de prueba unit 2 # 374",
            ID: "999-xxx-8888",
            TELEFONO: "999-888-777",
            activo: true
        };

        const user_id = "66b62fc3777ac9bdcc5050ed";

        const response = await ClientesRepository.post_cliente(mockData, user_id);
        const result = response._doc
        assert.ok(result, chalk.red('El resultado es nulo o indefinido'));

        const expectedKeys = [
            'CLIENTE',
            'PAIS_DESTINO',
            'CODIGO',
            'CORREO',
            'DIRECCIÓN',
            'ID',
            'TELEFONO',
            'activo',
            '_id',
            '__v'
        ];
        const resultKeys = Object.keys(result);

        assert.deepStrictEqual(
            resultKeys.sort(),
            expectedKeys.sort(),
            chalk.red('El resultado contiene campos inesperados o faltan campos')
        );

        assert.strictEqual(result.CLIENTE, mockData.CLIENTE, chalk.red('El campo CLIENTE no coincide'));
        assert.strictEqual(result.CODIGO, mockData.CODIGO, chalk.red('El campo CODIGO no coincide'));
        assert.strictEqual(result.CORREO, mockData.CORREO, chalk.red('El campo CORREO no coincide'));
        assert.strictEqual(result.ID, mockData.ID, chalk.red('El campo ID no coincide'));
        assert.strictEqual(result.DIRECCION, mockData.DIRECCION, chalk.red('El campo DIRECCION no coincide'));
        assert.strictEqual(result.TELEFONO, mockData.TELEFONO, chalk.red('El campo TELEFONO no coincide'));
        assert.strictEqual(result.activo, mockData.activo, chalk.red('El campo activo no coincide'));


        assert.ok(typeof result.PAIS_DESTINO === 'object', chalk.red('El campo PAIS_DESTINO no es un array'));
        assert.ok(isValidObjectId(result._id), chalk.red('El campo _id no es un ObjectId válido'));

        console.log(chalk.green.bold('Prueba PASADA: post_cliente\n'));

        return result._id
    } catch (err) {
        console.error(chalk.red.bold('Prueba FALLIDA: post_cliente'));
        console.error(chalk.red(err.message));
        throw err; // Lanza el error para el flujo general de pruebas
    }
};
const test_get_clientes = async (_id) => {

    const chalk = (await import('chalk')).default;
    console.log(chalk.blue.bold('Iniciando prueba: get_clientes'));

    try {
        //Prueba sin filtros
        const result = await ClientesRepository.get_clientes();
        assert.ok(result instanceof Array, chalk.red('No se devolvio un array'));
        assert.ok(result.length > 0, chalk.red(`El array tiene más de 50 elementos: ${result.length}`));

        const dato = result[0]

        assert.ok(isValidObjectId(dato._id), chalk.red('El campo _id no es un ObjectId válido'));
        assert.ok(typeof dato.CLIENTE === 'string', chalk.red('CLIENTE no es tipo String'));
        assert.ok(typeof dato.PAIS_DESTINO === 'string' || typeof dato.PAIS_DESTINO === 'object', chalk.red('CLIENTE no es tipo String'));
        assert.ok(typeof dato.CODIGO === 'number', chalk.red('CODIGO no es tipo number'));
        assert.ok(typeof dato.CORREO === 'string', chalk.red('CORREO no es tipo string'));
        assert.ok(typeof dato.DIRECCIÓN === 'string', chalk.red('DIRECCION no es tipo string'));
        assert.ok(typeof dato.ID === 'string', chalk.red('ID no es tipo string'));
        assert.ok(typeof dato.TELEFONO === 'string', chalk.red('TELEFONO no es tipo string'));
        assert.ok(typeof dato.activo === 'boolean', chalk.red('activo no es tipo boolean'));

        //prueba filtro ids
        const filtro1 = {
            ids: [_id, "659dbd9a347a42d89929340d", "659dbd9a347a42d89929340e"],
            select: { CLIENTE: 1 }
        }
        const result2 = await ClientesRepository.get_clientes({
            ids: filtro1.ids,
            select: filtro1.select
        });

        assert.ok(result2.length === 3, chalk.red(`Error en el numero de elementos probando filtro de ids: ${result.length}`));
        result2.forEach(element => {

            assert.ok(filtro1.ids.includes(element._id.toString()),
                chalk.red(`Un elemento no tiene uno de los ids de prueba, error en prueba del filtro ids: 
                ${result.length}`));

            assert.ok(!Object.prototype.hasOwnProperty.call(element._doc, 'CORREO'),
                chalk.red(`El select no selecciono correctamente, pues aparece CORREO en la busqueda: 
                ${result.length}`));
            assert.ok(Object.prototype.hasOwnProperty.call(element._doc, 'CLIENTE'),
                chalk.red(`El select no selecciono correctamente, pues no aparece CLIENTE en la busqueda: 
                ${result.length}`));
        });

        // Prueba sin resultados
        const resultNoMatch = await ClientesRepository.get_clientes({
            ids: ["676187a654dc2865d7b01900"]
        });
        assert.ok(resultNoMatch.length === 0, chalk.red('El array no está vacío cuando no debería haber resultados'));

        // Prueba con un id inválido
        try {
            await ClientesRepository.get_clientes({ ids: ["invalid_id"] });
            assert.fail(chalk.red('No se lanzó un error con un id inválido'));
        } catch (err) {
            assert.ok(err instanceof Error, chalk.red('No se lanzó el error correcto para un id inválido'));
        }

        // Prueba con un filtro mal formado
        try {
            await ClientesRepository.get_clientes({ kilos_total: "no_es_un_numero" });
            assert.fail(chalk.red('No se lanzó un error con un filtro mal formado'));
        } catch (err) {
            assert.ok(err instanceof Error, chalk.red('No se lanzó el error correcto para un filtro mal formado'));
        }

        // Prueba de select
        const selectResult = await ClientesRepository.get_clientes({
            select: { CLIENTE: 1, CODIGO: 1 }
        });

        selectResult.forEach(item => {
            assert.ok(Object.prototype.hasOwnProperty.call(item._doc, 'CLIENTE'),
                chalk.red('Falta el campo "CLIENTE" en el resultado de select'));
            assert.ok(Object.prototype.hasOwnProperty.call(item._doc, 'CODIGO'),
                chalk.red('Falta el campo "CODIGO" en el resultado de select'));
            assert.ok(!Object.prototype.hasOwnProperty.call(item._doc, 'DIRECCIÓN'),
                chalk.red('El campo "DIRECCIÓN" no debería estar en el resultado de select'));
        });

        const resultLargeDataset = await ClientesRepository.get_clientes();
        assert.ok(resultLargeDataset.length <= 1000, chalk.red('El método no maneja correctamente grandes cantidades de datos'));



        console.log(chalk.green.bold('Prueba PASADA: get_clientes\n'));

    } catch (err) {
        console.error(chalk.red.bold('Prueba FALLIDA: get_clientes'));
        console.error(chalk.red(err.message));
        throw err; // Lanza el error para el flujo general de pruebas
    }

};
const test_put_clientes = async (_id) => {

    const chalk = (await import('chalk')).default;
    console.log(chalk.blue.bold('Iniciando prueba: put_clientes'));

    try {

        const updateQuery = {
            CODIGO: 98888888,
            CORREO: "test2@node.com"
        };

        const result = await ClientesRepository.put_cliente(_id, updateQuery);

        // Verificar que el resultado no sea nulo
        assert.ok(result, chalk.red('No se devolvió ningún resultado de la actualización'));

        // Verificar que los campos actualizados coinciden con los valores esperados
        assert.strictEqual(result.CODIGO, updateQuery.CODIGO, chalk.red('CODIGO no se actualizó correctamente'));
        assert.strictEqual(result.CORREO, updateQuery.CORREO, chalk.red('CORREO no se actualizó correctamente'));

        assert.ok(isValidObjectId(result._id), chalk.red('El _id no es válido'));

        //probar con datos invalidos
        try {
            await ClientesRepository.put_cliente(_id, {
                CODIGO: 3
            });

            assert.fail(chalk.red('La función no lanzó un error con datos inválidos CODIGO repetido'));
        } catch (err) {
            assert.ok(err instanceof Error, chalk.red('No se lanzó un error correctamente para datos inválidos'));
            console.log(chalk.yellow('Prueba PASADA: Manejo de datos inválidos'));
        }

        console.log(chalk.green.bold('Prueba PASADA: put_clientes\n'));

    } catch (err) {
        console.error(chalk.red.bold('Prueba FALLIDA: put_clientes'));
        console.error(chalk.red(err.message));
        throw err; // Lanza el error para el flujo general de pruebas
    }
};
module.exports = {
    test_post_clientes,
    test_get_clientes,
    test_put_clientes
}