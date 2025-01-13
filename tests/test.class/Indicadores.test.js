const assert = require('assert')
const { isValidObjectId } = require('mongoose');
const { IndicadoresRepository } = require('../../server/Class/Indicadores');


const test_post_indicador = async () => {
    const chalk = (await import('chalk')).default;
    console.log(chalk.blue.bold('Iniciando prueba: post_indicador'));

    try {
        const mockData = {
            kilos_procesador: 100,
            meta_kilos_procesados: 200,
            total_horas_hombre: 8,
            tipo_fruta: ['Naranja', 'Mandarina'],
        };

        const response = await IndicadoresRepository.post_indicador(mockData);
        const result = response._doc || response;

        assert.ok(result, chalk.red('El resultado es nulo o indefinido'));

        const expectedKeys = [
            'fecha_creacion',
            'kilos_procesador',
            'meta_kilos_procesados',
            'total_horas_hombre',
            'tipo_fruta',
            '_id',
            '__v'
        ];

        const resultKeys = Object.keys(result);

        assert.deepStrictEqual(
            resultKeys.sort(),
            expectedKeys.sort(),
            chalk.red('El resultado contiene campos inesperados o faltan campos')
        );

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

        assert.deepStrictEqual(
            result.tipo_fruta,
            mockData.tipo_fruta,
            chalk.red('El campo tipo_fruta no coincide')
        );

        assert.ok(
            result.fecha_creacion instanceof Date,
            chalk.red('El campo fecha_creacion no es una instancia de Date')
        );

        assert.ok(
            isValidObjectId(result._id),
            chalk.red('El campo _id no es un ObjectId válido')
        );

        assert.strictEqual(
            result.__v,
            0,
            chalk.red('El campo __v no coincide')
        );

        console.log(chalk.green.bold('Prueba PASADA: post_indicador\n'));
        return result._id;
    } catch (err) {
        console.error(chalk.red.bold('Prueba FALLIDA: post_indicador'));
        console.error(chalk.red(err.message));
        throw err;
    }
};

const test_get_indicadores = async () => {
    const chalk = (await import('chalk')).default;
    console.log(chalk.blue.bold('Iniciando prueba: get_indicadores'));

    try {
        const result = await IndicadoresRepository.get_indicadores();

        assert.ok(Array.isArray(result), chalk.red('No se devolvió un array'));
        assert.ok(result.length > 0, chalk.red(`El array está vacío o no trajo resultados`));
        assert.ok(result.length <= 50, chalk.red(`El array tiene más de 50 elementos: ${result.length}`));

        const primerIndicador = result[0];
        assert.ok(typeof primerIndicador.kilos_procesador === 'number', chalk.red('kilos_procesador no es tipo número'));
        assert.ok(Array.isArray(primerIndicador.tipo_fruta), chalk.red('tipo_fruta no es un array'));
        assert.ok(primerIndicador.tipo_fruta.every(f => typeof f === 'string'), chalk.red('No todos los elementos de tipo_fruta son strings'));
        assert.ok(isValidObjectId(primerIndicador._id), chalk.red('El campo _id no es un ObjectId válido'));
        assert.ok(primerIndicador.fecha_creacion instanceof Date, chalk.red('fecha_creacion no es tipo Date'));
        assert.ok(typeof primerIndicador.__v === 'number', chalk.red('__v no es tipo Number'));

        console.log(chalk.green.bold('Prueba PASADA: get_indicadores\n'));
    } catch (err) {
        console.error(chalk.red.bold('Prueba FALLIDA: get_indicadores'));
        console.error(chalk.red(err.message));
        throw err;
    }
};

const test_put_indicador = async (existingId) => {
    const chalk = (await import('chalk')).default;
    console.log(chalk.blue.bold('Iniciando prueba: put_indicador'));

    try {
        const updateData = {
            kilos_procesador: 999,
            total_horas_hombre: 10,
            tipo_fruta: ['Manzana', 'Pera']
        };

        const updatedDoc = await IndicadoresRepository.put_indicador(existingId, updateData);

        assert.ok(updatedDoc, chalk.red('No se encontró el documento a actualizar o no se devolvió nada'));
        assert.ok(isValidObjectId(updatedDoc._id), chalk.red('El _id no es un ObjectId válido'));

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
        assert.deepStrictEqual(
            updatedDoc.tipo_fruta,
            updateData.tipo_fruta,
            chalk.red('No se actualizó tipo_fruta correctamente')
        );

        console.log(chalk.green.bold('Prueba PASADA: put_indicador\n'));
    } catch (err) {
        console.error(chalk.red.bold('Prueba FALLIDA: put_indicador'));
        console.error(chalk.red(err.message));
        throw err;
    }
};


module.exports = {
    test_post_indicador,
    test_get_indicadores,
    test_put_indicador
}
