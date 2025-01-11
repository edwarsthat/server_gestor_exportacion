const assert = require('assert')
const { isValidObjectId } = require('mongoose');
const { IndicadoresRepository } = require('../../server/Class/Indicadores');


const test_post_indicador = async () => {
    // Import dinámico de chalk (similar a tu ejemplo). 
    // Si lo tienes importado de forma estática, sáltate este paso.
    const chalk = (await import('chalk')).default;
    console.log(chalk.blue.bold('Iniciando prueba: post_indicador'));

    try {
        // Datos simulados (mock) para tu prueba
        const mockData = {
            kilos_procesador: 100,
            meta_kilos_procesados: 200,
            total_horas_hombre: 8,
            tipo_fruta: 'Naranja',
        };

        const response = await IndicadoresRepository.post_indicador(mockData)

        // Normalmente, mongoose retorna el documento completo;
        // si quieres acceder a la versión "plana", usa `response._doc`.
        // Dependerá de cómo hayas implementado la inserción en tu repo.
        const result = response._doc || response;

        // 1. Verificamos que el resultado no sea nulo o undefined
        assert.ok(result, chalk.red('El resultado es nulo o indefinido'));

        // 2. Definimos las claves esperadas de tu esquema actual
        //    (si en un futuro el esquema crece, actualiza este array).
        const expectedKeys = [
            'fecha_creacion',
            'kilos_procesador',
            'meta_kilos_procesados',
            'total_horas_hombre',
            'tipo_fruta',
            '_id',
            '__v'
        ];

        // Obtenemos las claves que vienen realmente en el objeto
        const resultKeys = Object.keys(result);

        // 3. Comparamos que las claves concuerden
        assert.deepStrictEqual(
            resultKeys.sort(),
            expectedKeys.sort(),
            chalk.red('El resultado contiene campos inesperados o faltan campos')
        );

        // 4. Verificamos valor por valor
        assert.strictEqual(
            result.kilos_procesador,
            mockData.kilos_procesador,
            chalk.red('El campo kilos_procesador no coincide')
        );

        assert.strictEqual(
            result.meta_kilos_procesados,
            mockData.meta_kilos_procesados,
            chalk.red('El campo meta_kilos_procesados no coincide')
        );

        assert.strictEqual(
            result.total_horas_hombre,
            mockData.total_horas_hombre,
            chalk.red('El campo total_horas_hombre no coincide')
        );

        assert.strictEqual(
            result.tipo_fruta,
            mockData.tipo_fruta,
            chalk.red('El campo tipo_fruta no coincide')
        );

        // 5. Validamos la fecha de creación
        assert.ok(
            result.fecha_creacion instanceof Date,
            chalk.red('El campo fecha_creacion no es una instancia de Date')
        );

        // 6. Validamos que el _id sea un ObjectId de mongoose
        assert.ok(
            isValidObjectId(result._id),
            chalk.red('El campo _id no es un ObjectId válido')
        );

        // 7. Verificamos que __v sea 0 (versión del documento en mongoose)
        assert.strictEqual(
            result.__v,
            0,
            chalk.red('El campo __v no coincide')
        );

        console.log(chalk.green.bold('Prueba PASADA: post_indicador\n'));

        // Si deseas, podrías retornar el ID para usarlo en otras pruebas
        return result._id;
    } catch (err) {
        console.error(chalk.red.bold('Prueba FALLIDA: post_indicador'));
        console.error(chalk.red(err.message));
        throw err; // Importante para que el runner de test sepa que falló
    }
};
const test_get_indicadores = async (_id) => {
    // Import dinámico de chalk (igual que en tus ejemplos). 
    // Si usas una importación estática, ajústalo según tu caso.
    const chalk = (await import('chalk')).default;
    console.log(chalk.blue.bold('Iniciando prueba: get_indicadores'));

    try {
        // 1. Prueba sin filtros
        // ------------------------------------------------------------------

        const result = await IndicadoresRepository.get_indicadores();

        assert.ok(Array.isArray(result), chalk.red('No se devolvió un array'));
        // Ajusta según tu criterio (por ejemplo, máximo 50).
        // Aquí se hace la misma verificación que en tu ejemplo base.
        assert.ok(result.length > 0, chalk.red(`El array está vacío o no trajo resultados`));
        assert.ok(result.length <= 50, chalk.red(`El array tiene más de 50 elementos: ${result.length}`));

        // Verificamos algunos campos del primer elemento
        const primerIndicador = result[0];
        assert.ok(typeof primerIndicador.kilos_procesador === 'number', chalk.red('kilos_procesador no es tipo número'));
        assert.ok(isValidObjectId(primerIndicador._id), chalk.red('El campo _id no es un ObjectId válido'));
        // Recuerda que en tu esquema se llama "fecha_creacion", no "createdAt"
        assert.ok(primerIndicador.fecha_creacion instanceof Date, chalk.red('fecha_creacion no es tipo Date'));
        assert.ok(typeof primerIndicador.__v === 'number', chalk.red('__v no es tipo Number'));

        // 2. Prueba con filtro de IDs
        // ------------------------------------------------------------------
        const filtro1 = {
            ids: [_id, '678298b1509371bcc89989ac', "67829a77838ff8778ad4f182"],
            select: { kilos_procesador: 1, tipo_fruta: 1 }
        };
        const result2 = await IndicadoresRepository.get_indicadores(filtro1);

        // Verificamos que traiga exactamente 3
        assert.strictEqual(result2.length, 3, chalk.red(`Error en el número de elementos probando filtro de ids: ${result2.length}`));

        // Verificamos que cada uno coincida con el filtro y que solo traiga los campos select
        result2.forEach((element) => {
            // Comprobamos que el _id devuelto está en filtro1.ids
            assert.ok(
                filtro1.ids.includes(element._id.toString()),
                chalk.red(`Un elemento no coincide con los IDs de prueba: ${element._id.toString()}`)
            );

            // Chequeamos que NO aparezca un campo que no esté en el select 
            // (por ejemplo, 'fecha_creacion').
            assert.ok(
                !Object.prototype.hasOwnProperty.call(element._doc, 'fecha_creacion'),
                chalk.red(`El select no funcionó correctamente; se incluyó fecha_creacion`)
            );

            // Chequeamos que SÍ aparezca kilos_procesador y tipo_fruta
            assert.ok(
                Object.prototype.hasOwnProperty.call(element._doc, 'kilos_procesador'),
                chalk.red(`El select no incluyó kilos_procesador`)
            );
            assert.ok(
                Object.prototype.hasOwnProperty.call(element._doc, 'tipo_fruta'),
                chalk.red(`El select no incluyó tipo_fruta`)
            );
        });

        // 3. Prueba sin resultados (IDs que no existen)
        // ------------------------------------------------------------------
        const resultNoMatch = await IndicadoresRepository.get_indicadores({
            ids: ['64d3c5f89f4e0225c493ffff'] // Un ID inexistente
        });
        assert.ok(resultNoMatch.length === 0, chalk.red('El array no está vacío cuando no debería haber resultados'));

        // 4. Prueba de orden (sort) por fecha_creacion en orden descendente
        // ------------------------------------------------------------------
        const resultSorted = await IndicadoresRepository.get_indicadores({
            sort: { fecha_creacion: -1 }
        });
        for (let i = 1; i < resultSorted.length; i++) {
            assert.ok(
                resultSorted[i - 1].fecha_creacion >= resultSorted[i].fecha_creacion,
                chalk.red('El orden descendente por fecha_creacion no se respetó')
            );
        }

        // 5. Prueba de paginación (limit y skip)
        // ------------------------------------------------------------------
        const page1 = await IndicadoresRepository.get_indicadores({ limit: 10, skip: 0 });
        const page2 = await IndicadoresRepository.get_indicadores({ limit: 10, skip: 10 });

        assert.ok(page1.length <= 10, chalk.red('La página 1 tiene más de 10 elementos'));
        assert.ok(page2.length <= 10, chalk.red('La página 2 tiene más de 10 elementos'));

        if (page1.length > 0 && page2.length > 0) {
            assert.ok(
                page1[0]._id.toString() !== page2[0]._id.toString(),
                chalk.red('La paginación no está funcionando correctamente, hay elementos repetidos entre páginas')
            );
        }

        // 6. Prueba con un id inválido
        // ------------------------------------------------------------------
        try {
            await IndicadoresRepository.get_indicadores({ ids: ['invalid_id'] });
            assert.fail(chalk.red('No se lanzó un error con un ID inválido'));
        } catch (err) {
            assert.ok(err instanceof Error, chalk.red('No se lanzó el error correcto para un ID inválido'));
        }

        // 7. Prueba con un filtro mal formado
        // ------------------------------------------------------------------
        try {
            // Por ejemplo, un valor que debería ser número lo pasamos como string
            await IndicadoresRepository.get_indicadores({ kilos_procesador: 'no_es_un_numero' });
            assert.fail(chalk.red('No se lanzó un error con un filtro mal formado'));
        } catch (err) {
            assert.ok(err instanceof Error, chalk.red('No se lanzó el error correcto para un filtro mal formado'));
        }

        // 8. Prueba de select (campos que se devuelven)
        // ------------------------------------------------------------------
        const selectResult = await IndicadoresRepository.get_indicadores({
            select: { kilos_procesador: 1, total_horas_hombre: 1 }
        });
        selectResult.forEach((item) => {
            // Debe aparecer kilos_procesador
            assert.ok(
                Object.prototype.hasOwnProperty.call(item._doc, 'kilos_procesador'),
                chalk.red('Falta el campo "kilos_procesador" en el resultado de select')
            );
            // Debe aparecer total_horas_hombre
            assert.ok(
                Object.prototype.hasOwnProperty.call(item._doc, 'total_horas_hombre'),
                chalk.red('Falta el campo "total_horas_hombre" en el resultado de select')
            );
            // NO debe aparecer fecha_creacion, por ejemplo, si no está en el select
            assert.ok(
                !Object.prototype.hasOwnProperty.call(item._doc, 'fecha_creacion'),
                chalk.red('El campo "fecha_creacion" no debería estar en el resultado de select')
            );
        });

        // 9. Prueba con un dataset grande
        // ------------------------------------------------------------------
        const resultLargeDataset = await IndicadoresRepository.get_indicadores();
        assert.ok(resultLargeDataset.length <= 1000, chalk.red('El método no maneja correctamente grandes cantidades de datos'));

        console.log(chalk.green.bold('Prueba PASADA: get_indicadores\n'));
    } catch (err) {
        console.error(chalk.red.bold('Prueba FALLIDA: get_indicadores'));
        console.error(chalk.red(err.message));
        throw err; // Lanza el error para el flujo general de pruebas
    }
};
const test_put_indicador = async (existingId) => {
    const chalk = (await import('chalk')).default;
    console.log(chalk.blue.bold('Iniciando prueba: put_indicador'));

    try {
        // 1. Actualización con datos válidos
        // ------------------------------------------------------------------
        const updateData = {
            kilos_procesador: 999,
            total_horas_hombre: 10
        };
        // Suponemos que `existingId` corresponde a un documento ya existente en la base.
        const updatedDoc = await IndicadoresRepository.put_indicador(existingId, updateData);

        // Verificamos que se haya encontrado y actualizado el documento
        assert.ok(updatedDoc, chalk.red('No se encontró el documento a actualizar o no se devolvió nada'));
        assert.ok(isValidObjectId(updatedDoc._id), chalk.red('El _id no es un ObjectId válido'));

        // Verificamos que los campos se hayan actualizado correctamente
        assert.strictEqual(
            updatedDoc.kilos_procesador,
            updateData.kilos_procesador,
            chalk.red('No se actualizó kilos_procesador correctamente')
        );
        assert.strictEqual(
            updatedDoc.total_horas_hombre,
            updateData.total_horas_hombre,
            chalk.red('No se actualizó total_horas_hombre correctamente')
        );

        // 2. Intento de actualización con un ID que NO existe en la BD
        // ------------------------------------------------------------------
        // Usamos un ObjectId válido pero que sabemos (o esperamos) que no exista.
        const nonExistentId = '64d3c6009f4e0225c493aaaa';
        const resultNonExistent = await IndicadoresRepository.put_indicador(nonExistentId, {
            kilos_procesador: 111
        });
        assert.strictEqual(
            resultNonExistent,
            null,
            chalk.red('Se devolvió un documento cuando no debería existir para ese ID')
        );

        // 3. Intento de actualización con un ID inválido (no es ObjectId)
        // ------------------------------------------------------------------
        try {
            await IndicadoresRepository.put_indicador('id_invalido', { kilos_procesador: 123 });
            assert.fail(chalk.red('No se lanzó un error con un ID inválido'));
        } catch (err) {
            // Verificamos que se lance el error esperado
            assert.ok(
                err instanceof Error,
                chalk.red('No se lanzó el error correcto para un ID inválido')
            );
        }

        // 4. Intento de actualización con un campo mal formado
        // ------------------------------------------------------------------
        // Por ejemplo, pasar un string a un campo que debería ser numérico
        try {
            await IndicadoresRepository.put_indicador(existingId, {
                kilos_procesador: 'no_es_un_numero'
            });
            assert.fail(chalk.red('No se lanzó un error con un campo mal formado'));
        } catch (err) {
            assert.ok(
                err instanceof Error,
                chalk.red('No se lanzó el error correcto para un campo mal formado')
            );
        }

        console.log(chalk.green.bold('Prueba PASADA: put_indicador\n'));
    } catch (err) {
        console.error(chalk.red.bold('Prueba FALLIDA: put_indicador'));
        console.error(chalk.red(err.message));
        throw err; // Importante para que el runner de test detecte el error
    }
};

module.exports = {
    test_post_indicador,
    test_get_indicadores,
    test_put_indicador
}
