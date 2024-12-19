const assert = require('assert')
const { FrutaDescompuestaRepository } = require('../../server/Class/FrutaDescompuesta')
const { isValidObjectId } = require('mongoose')

const test_post_fruta_descompuesta = async () => {

    const chalk = (await import('chalk')).default;
    console.log(chalk.blue.bold('Iniciando prueba: post_fruta_descompuesta'));

    try {
        const mockData = {
            kilos_total: 5,
            razon: "Test unitario correcto",
            comentario_adicional: "N/A",
            tipo_fruta: "Naranja",
        };

        const user_id = "66b62fc3777ac9bdcc5050ed";

        const response = await FrutaDescompuestaRepository.post_fruta_descompuesta(mockData, user_id);
        const result = response._doc

        assert.ok(result, chalk.red('El resultado es nulo o indefinido'));

        const expectedKeys = ['kilos_total', 'razon', 'comentario_adicional', 'tipo_fruta', 'user', '_id', 'createdAt', '__v'];
        const resultKeys = Object.keys(result);

        assert.deepStrictEqual(
            resultKeys.sort(),
            expectedKeys.sort(),
            chalk.red('El resultado contiene campos inesperados o faltan campos')
        );

        assert.strictEqual(result.kilos_total, mockData.kilos_total, chalk.red('El campo kilos_total no coincide'));
        assert.strictEqual(result.user, user_id, chalk.red('El campo user no coincide'));
        assert.strictEqual(result.razon, mockData.razon, chalk.red('El campo razon no coincide'));
        assert.strictEqual(
            result.comentario_adicional,
            mockData.comentario_adicional,
            chalk.red('El campo comentario_adicional no coincide')
        );

        assert.ok(result.createdAt instanceof Date, chalk.red('El campo createdAt no es una instancia de Date'));
        assert.ok(isValidObjectId(result._id), chalk.red('El campo _id no es un ObjectId válido'));
        assert.strictEqual(result.__v, 0, chalk.red('El campo __v no coincide'));

        console.log(chalk.green.bold('Prueba PASADA: post_fruta_descompuesta\n'));

        return result._id
    } catch (err) {
        console.error(chalk.red.bold('Prueba FALLIDA: post_fruta_descompuesta'));
        console.error(chalk.red(err.message));
        throw err; // Lanza el error para el flujo general de pruebas
    }
};
const test_get_fruta_descompuesta = async (_id) => {

    const chalk = (await import('chalk')).default;
    console.log(chalk.blue.bold('Iniciando prueba: get_fruta_descompuesta'));

    try {
        //Prueba sin filtros
        const result = await FrutaDescompuestaRepository.get_fruta_descompuesta();
        assert.ok(result instanceof Array, chalk.red('No se devolvio un array'));
        assert.ok(result.length > 0, chalk.red(`El array tiene más de 50 elementos: ${result.length}`));
        assert.ok(result.length <= 50, chalk.red(`El array tiene más de 50 elementos: ${result.length}`));

        const dato = result[0]

        assert.ok(typeof dato.kilos_total === 'number', chalk.red('kilos_total no es tipo numero'));
        assert.ok(isValidObjectId(dato._id), chalk.red('El campo _id no es un ObjectId válido'));
        assert.ok(typeof dato.user === 'string', chalk.red('user no es tipo String'));
        assert.ok(dato.createdAt instanceof Date, chalk.red('createdAt no es tipo Date'));
        assert.ok(typeof dato.__v === 'number', chalk.red('__v no es tipo Number'));

        //prueba filtro ids
        const filtro1 = {
            ids: [_id, "676188b354dc2865d7b01907", "676192585519668a86fe6bfb"],
            select: { user: 1 }
        }
        const result2 = await FrutaDescompuestaRepository.get_fruta_descompuesta({
            ids: filtro1.ids,
            select: filtro1.select
        });

        assert.ok(result2.length === 3, chalk.red(`Error en el numero de elementos probando filtro de ids: ${result.length}`));
        result2.forEach(element => {

            assert.ok(filtro1.ids.includes(element._id.toString()),
                chalk.red(`Un elemento no tiene uno de los ids de prueba, error en prueba del filtro ids: 
                ${result.length}`));

            assert.ok(!Object.prototype.hasOwnProperty.call(element._doc, 'createdAt'),
                chalk.red(`El select no selecciono correctamente, pues aparece createdAt en la busqueda: 
                ${result.length}`));
            assert.ok(Object.prototype.hasOwnProperty.call(element._doc, 'user'),
                chalk.red(`El select no selecciono correctamente, pues no aparece user en la busqueda: 
                ${result.length}`));
        });

        // Prueba sin resultados
        const resultNoMatch = await FrutaDescompuestaRepository.get_fruta_descompuesta({
            ids: ["676187a654dc2865d7b01900"]
        });
        assert.ok(resultNoMatch.length === 0, chalk.red('El array no está vacío cuando no debería haber resultados'));

        // Prueba de orden descendente por createdAt
        const resultSorted = await FrutaDescompuestaRepository.get_fruta_descompuesta({
            sort: { createdAt: -1 } // Orden descendente
        });
        for (let i = 1; i < resultSorted.length; i++) {
            assert.ok(resultSorted[i - 1].createdAt >= resultSorted[i].createdAt,
                chalk.red('El orden descendente por createdAt no se respetó'));
        }

        // Prueba de paginación
        const page1 = await FrutaDescompuestaRepository.get_fruta_descompuesta({ limit: 10, skip: 0 });
        const page2 = await FrutaDescompuestaRepository.get_fruta_descompuesta({ limit: 10, skip: 10 });

        assert.ok(page1.length <= 10, chalk.red('La página 1 tiene más de 10 elementos'));
        assert.ok(page2.length <= 10, chalk.red('La página 2 tiene más de 10 elementos'));
        assert.ok(page1[0]._id.toString() !== page2[0]._id.toString(),
            chalk.red('La paginación no está funcionando correctamente, hay elementos repetidos'));


        // Prueba con un id inválido
        try {
            await FrutaDescompuestaRepository.get_fruta_descompuesta({ ids: ["invalid_id"] });
            assert.fail(chalk.red('No se lanzó un error con un id inválido'));
        } catch (err) {
            assert.ok(err instanceof Error, chalk.red('No se lanzó el error correcto para un id inválido'));
        }

        // Prueba con un filtro mal formado
        try {
            await FrutaDescompuestaRepository.get_fruta_descompuesta({ kilos_total: "no_es_un_numero" });
            assert.fail(chalk.red('No se lanzó un error con un filtro mal formado'));
        } catch (err) {
            assert.ok(err instanceof Error, chalk.red('No se lanzó el error correcto para un filtro mal formado'));
        }

        // Prueba de select
        const selectResult = await FrutaDescompuestaRepository.get_fruta_descompuesta({
            select: { user: 1, kilos_total: 1 }
        });

        selectResult.forEach(item => {
            assert.ok(Object.prototype.hasOwnProperty.call(item._doc, 'user'),
                chalk.red('Falta el campo "user" en el resultado de select'));
            assert.ok(Object.prototype.hasOwnProperty.call(item._doc, 'kilos_total'),
                chalk.red('Falta el campo "kilos_total" en el resultado de select'));
            assert.ok(!Object.prototype.hasOwnProperty.call(item._doc, 'createdAt'),
                chalk.red('El campo "createdAt" no debería estar en el resultado de select'));
        });

        const resultLargeDataset = await FrutaDescompuestaRepository.get_fruta_descompuesta();
        assert.ok(resultLargeDataset.length <= 1000, chalk.red('El método no maneja correctamente grandes cantidades de datos'));



        console.log(chalk.green.bold('Prueba PASADA: get_fruta_descompuesta\n'));

    } catch (err) {
        console.error(chalk.red.bold('Prueba FALLIDA: get_fruta_descompuesta'));
        console.error(chalk.red(err.message));
        throw err; // Lanza el error para el flujo general de pruebas
    }

};
const test_put_fruta_descompuesta = async (_id) => {

    const chalk = (await import('chalk')).default;
    console.log(chalk.blue.bold('Iniciando prueba: put_fruta_descompuesta'));

    try {

        const updateQuery = {
            kilos_total: 10,
            razon: "Actualización de prueba"
        };

        const result = await FrutaDescompuestaRepository.put_fruta_descompuesta(_id, updateQuery);

        // Verificar que el resultado no sea nulo
        assert.ok(result, chalk.red('No se devolvió ningún resultado de la actualización'));

        // Verificar que los campos actualizados coinciden con los valores esperados
        assert.strictEqual(result.kilos_total, updateQuery.kilos_total, chalk.red('kilos_total no se actualizó correctamente'));
        assert.strictEqual(result.razon, updateQuery.razon, chalk.red('razon no se actualizó correctamente'));

        // Verificar que los campos no actualizados permanecen iguales
        assert.ok(result.createdAt instanceof Date, chalk.red('createdAt cambió o no es válido'));
        assert.ok(isValidObjectId(result._id), chalk.red('El _id no es válido'));

        //probar con datos invalidos
        try {
            await FrutaDescompuestaRepository.put_fruta_descompuesta(_id, {
                kilos_total: "no_es_un_numero"
            });

            assert.fail(chalk.red('La función no lanzó un error con datos inválidos'));
        } catch (err) {
            assert.ok(err instanceof Error, chalk.red('No se lanzó un error correctamente para datos inválidos'));
            console.log(chalk.yellow('Prueba PASADA: Manejo de datos inválidos'));
        }

        console.log(chalk.green.bold('Prueba PASADA: put_fruta_descompuesta\n'));

    } catch (err) {
        console.error(chalk.red.bold('Prueba FALLIDA: put_fruta_descompuesta'));
        console.error(chalk.red(err.message));
        throw err; // Lanza el error para el flujo general de pruebas
    }
};
const test_delete_fruta_descompuesta = async (_id) => {
    const chalk = (await import('chalk')).default;
    console.log(chalk.blue.bold('Iniciando prueba: delete_fruta_descompuesta'));

    try {
        // Ejecutar el método de eliminación
        const result = await FrutaDescompuestaRepository.delete_fruta_descompuesta(_id);

        // Verificar que el resultado no sea nulo
        assert.ok(result, chalk.red('No se devolvió ningún resultado al eliminar el registro'));

        // Verificar que el registro eliminado tiene el mismo `_id`
        assert.strictEqual(result._id.toString(), _id, chalk.red('El _id del registro eliminado no coincide'));

        try {
            const result = await FrutaDescompuestaRepository.delete_fruta_descompuesta('66b62fc3777ac9bdcc5050ed'); // ID inexistente
            assert.strictEqual(result, null, chalk.red('La función no devolvió null para un registro inexistente'));
            console.log(chalk.green('Prueba PASADA: Manejo de registro inexistente'));
        } catch (err) {
            console.error(chalk.red('Prueba FALLIDA: Manejo de registro inexistente'), err.message);
        }

        try {
            await FrutaDescompuestaRepository.delete_fruta_descompuesta('id_invalido');
            assert.fail(chalk.red('La función no lanzó un error para un ID inválido'));
        } catch (err) {
            assert.ok(err instanceof Error, chalk.red('No se lanzó el error correcto para un ID inválido'));
            console.log(chalk.green('Prueba PASADA: Manejo de ID inválido'));
        }

        console.log(chalk.green.bold('Prueba PASADA: delete_fruta_descompuesta\n'));
    } catch (err) {
        console.error(chalk.red.bold('Prueba FALLIDA: delete_fruta_descompuesta'));
        console.error(chalk.red(err.message));
        throw err; // Lanza el error para el flujo general de pruebas
    }
}


module.exports = {
    test_post_fruta_descompuesta,
    test_get_fruta_descompuesta,
    test_put_fruta_descompuesta,
    test_delete_fruta_descompuesta
}
