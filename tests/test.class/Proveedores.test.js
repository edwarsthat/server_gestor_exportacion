const assert = require('assert')
const { isValidObjectId } = require('mongoose');
const { ProveedoresRepository } = require('../../server/Class/Proveedores');

const test_post_proveedores = async () => {
    const chalk = (await import('chalk')).default;
    console.log(chalk.blue.bold('Iniciando prueba: post_predios'));

    try {
        // Datos simulados (mockData) para crear un nuevo documento en la colección "Predios"
        const mockData = {
            PREDIO: "Predio de pruebas unitarias",
            // ICA es un subdocumento
            ICA: {
                code: "ICA-TEST-123",
                tipo_fruta: ["Naranja", "Limon"],
                fechaVencimiento: new Date()
            },
            "CODIGO INTERNO": 99999,
            // GGN es otro subdocumento
            GGN: {
                code: "GGN-TEST-ABC",
                fechaVencimiento: new Date(),
                paises: ["Colombia", "Brasil"],
                tipo_fruta: ["Naranja", "Limon"]
            },
            tipo_fruta: {
                "Naranja Valencia": {
                    arboles: 50,
                    hectareas: 10
                },
                "Limon Tahití": {
                    arboles: 100,
                    hectareas: 20
                }
            },
            PROVEEDORES: "Proveedor de prueba",
            DEPARTAMENTO: "CUNDINAMARCA",
            urlArchivos: ["http://ejemplo.com/archivo1.jpg"],
            activo: true,
            precio: {
                Limon: {
                    "1": 100,
                    "15": 200,
                    "2": 300,
                    frutaNacional: 400,
                    descarte: 500,
                    combinado: 600
                },
                Naranja: {
                    "1": 700,
                    "15": 800,
                    "2": 900,
                    frutaNacional: 1000,
                    descarte: 1100,
                    zumex: 1200
                },
                fecha: new Date()
            },
            SISPAP: false,
            telefono_predio: "3000000000",
            contacto_finca: "Juan Pérez",
            correo_informes: "informes@predio.com",
            telefono_propietario: "3000001111",
            propietario: "Propietario de prueba",
            razon_social: "Empresa ABC",
            nit_facturar: "900123456-7",

            // Campos varios para depurar/limpiar
            // ICA_temp: "Temporal",
            // "FECHA VENCIMIENTO GGN": "2025-12-31",
            // N: true,
            // L: false,
            // M: true,
            // alt: "Cualquier otra cosa"
        };

        // Si tu método requiere un user_id u otro parámetro adicional, pásalo aquí
        const user_id = "66b62fc3777ac9bdcc5050ed";

        // Se asume que PrediosRepository.post_predio crea el registro en DB
        const response = await ProveedoresRepository.addProveedor(mockData, user_id);
        const result = response._doc;  // Asegúrate de que tu repositorio retorne el documento Mongoose

        assert.ok(result, chalk.red('El resultado es nulo o indefinido'));

        // Validamos que existan los campos claves:
        const expectedKeys = [
            'PREDIO',
            'ICA',
            'CODIGO INTERNO',
            'GGN',
            'tipo_fruta',
            'PROVEEDORES',
            'DEPARTAMENTO',
            'urlArchivos',
            'activo',
            'precio',
            'SISPAP',
            'telefono_predio',
            'contacto_finca',
            'correo_informes',
            'telefono_propietario',
            'propietario',
            'razon_social',
            'nit_facturar',
            '_id',
            '__v'
        ];

        const resultKeys = Object.keys(result);
        assert.deepStrictEqual(
            resultKeys.sort(),
            expectedKeys.sort(),
            chalk.red('El resultado contiene campos inesperados o faltan campos')
        );

        // Verificaciones de algunos campos puntuales
        assert.strictEqual(result.PREDIO, mockData.PREDIO, chalk.red('El campo PREDIO no coincide'));
        assert.strictEqual(result["CODIGO INTERNO"], mockData["CODIGO INTERNO"], chalk.red('El campo CODIGO INTERNO no coincide'));
        assert.strictEqual(result.PROVEEDORES, mockData.PROVEEDORES, chalk.red('El campo PROVEEDORES no coincide'));
        assert.strictEqual(result.DEPARTAMENTO, mockData.DEPARTAMENTO, chalk.red('El campo DEPARTAMENTO no coincide'));
        assert.strictEqual(result.activo, mockData.activo, chalk.red('El campo activo no coincide'));

        // Subdocumentos
        assert.ok(typeof result.ICA === 'object', chalk.red('El campo ICA no es un objeto (subdocumento)'));
        assert.ok(typeof result.GGN === 'object', chalk.red('El campo GGN no es un objeto (subdocumento)'));
        assert.ok(typeof result.precio === 'object', chalk.red('El campo precio no es un objeto (subdocumento)'));

        // Verificar que se generó un ObjectId válido
        assert.ok(isValidObjectId(result._id), chalk.red('El campo _id no es un ObjectId válido'));

        console.log(chalk.green.bold('Prueba PASADA: post_predios\n'));

        // Retornamos el id para usarlo en las siguientes pruebas
        return result._id;

    } catch (err) {
        console.error(chalk.red.bold('Prueba FALLIDA: post_predios'));
        console.error(chalk.red(err.message));
        throw err;
    }
};
const test_get_proveedores = async (_id) => {
    const chalk = (await import('chalk')).default;
    console.log(chalk.blue.bold('Iniciando prueba: get_predios'));

    try {
        // Prueba sin filtros
        const result = await ProveedoresRepository.get_proveedores();
        assert.ok(result instanceof Array, chalk.red('No se devolvió un array'));
        assert.ok(result.length > 0, chalk.red('No se encontró ningún documento en la colección de predios'));

        const dato = result[0];

        // Validar algunos campos
        assert.ok(isValidObjectId(dato._id), chalk.red('El campo _id no es un ObjectId válido'));
        assert.ok(typeof dato.PREDIO === 'string', chalk.red('PREDIO no es tipo String'));
        assert.ok(typeof dato["CODIGO INTERNO"] === 'number', chalk.red('CODIGO INTERNO no es tipo number'));
        assert.ok(typeof dato.activo === 'boolean', chalk.red('activo no es tipo boolean'));

        // Prueba con filtros por ids y select
        const filtroIds = {
            ids: [_id, "655e68b24e055637327c2f78", "655e68b24e055637327c2f06"],
            select: { PREDIO: 1, DEPARTAMENTO: 1 }
        };

        const result2 = await ProveedoresRepository.get_proveedores(filtroIds);
        // Esperamos que devuelva 3 documentos (o menos si alguno no existe)
        assert.ok(result2.length === 3, chalk.red(`Error en el número de elementos con filtro ids: se obtuvieron ${result2.length}`));

        result2.forEach(element => {
            // Validar que el id está en el array solicitado
            assert.ok(filtroIds.ids.includes(element._id.toString()),
                chalk.red(`Uno de los elementos no coincide con los ids solicitados: ${element._id}`));

            // Validar que sólo se obtuvieron los campos del select
            assert.ok(!Object.prototype.hasOwnProperty.call(element._doc, 'PROVEEDORES'),
                chalk.red('El campo PROVEEDORES no debería aparecer con el select aplicado'));
            assert.ok(Object.prototype.hasOwnProperty.call(element._doc, 'PREDIO'),
                chalk.red('El campo PREDIO debería aparecer con el select aplicado'));
        });

        // Prueba sin resultados (id inexistente)
        const resultNoMatch = await ProveedoresRepository.get_proveedores({
            ids: ["676187a654dc2865d7b01900"]
        });
        assert.ok(resultNoMatch.length === 0, chalk.red('Se encontraron registros cuando no deberían existir'));

        // Prueba con un id inválido
        try {
            await ProveedoresRepository.get_proveedores({ ids: ["id_invalido"] });
            assert.fail(chalk.red('No se lanzó un error con un id inválido'));
        } catch (err) {
            assert.ok(err instanceof Error, chalk.red('No se lanzó el error correcto para un id inválido'));
        }

        // Prueba con un filtro mal formado (campo inexistente o tipo incorrecto)
        try {
            await ProveedoresRepository.get_proveedores({ kilos_total: "no_es_un_numero" });
            assert.fail(chalk.red('No se lanzó un error con un filtro mal formado'));
        } catch (err) {
            assert.ok(err instanceof Error, chalk.red('No se lanzó el error correcto para un filtro mal formado'));
        }

        // Prueba de select
        const selectResult = await ProveedoresRepository.get_proveedores({
            select: { PREDIO: 1, "CODIGO INTERNO": 1 }
        });
        selectResult.forEach(item => {
            assert.ok(Object.prototype.hasOwnProperty.call(item._doc, 'PREDIO'),
                chalk.red('Falta el campo "PREDIO" en el resultado de select'));
            assert.ok(Object.prototype.hasOwnProperty.call(item._doc, 'CODIGO INTERNO'),
                chalk.red('Falta el campo "CODIGO INTERNO" en el resultado de select'));
            assert.ok(!Object.prototype.hasOwnProperty.call(item._doc, 'DEPARTAMENTO'),
                chalk.red('El campo "DEPARTAMENTO" no debería estar en el resultado de select'));
        });

        // Prueba de dataset grande (ejemplo)
        const resultLargeDataset = await ProveedoresRepository.get_proveedores();
        assert.ok(resultLargeDataset.length <= 5000, // Ajusta el límite según tu caso
            chalk.red('El método no maneja correctamente grandes cantidades de datos'));

        console.log(chalk.green.bold('Prueba PASADA: get_predios\n'));

    } catch (err) {
        console.error(chalk.red.bold('Prueba FALLIDA: get_predios'));
        console.error(chalk.red(err.message));
        throw err;
    }
};
const test_put_predios = async (_id) => {
    const chalk = (await import('chalk')).default;
    console.log(chalk.blue.bold('Iniciando prueba: put_predios'));

    try {
        // Datos de actualización
        const updateQuery = {
            "CODIGO INTERNO": 111111,
            DEPARTAMENTO: "ACTUALIZADO"
        };

        const result = await ProveedoresRepository.modificar_proveedores(_id, updateQuery);

        // Verificar que el resultado no sea nulo
        assert.ok(result, chalk.red('No se devolvió ningún resultado de la actualización'));

        // Verificar que los campos actualizados coinciden con los valores esperados
        assert.strictEqual(result["CODIGO INTERNO"], updateQuery["CODIGO INTERNO"],
            chalk.red('CODIGO INTERNO no se actualizó correctamente'));
        assert.strictEqual(result.DEPARTAMENTO, updateQuery.DEPARTAMENTO,
            chalk.red('DEPARTAMENTO no se actualizó correctamente'));

        // Verificar que el _id se mantiene válido
        assert.ok(isValidObjectId(result._id), chalk.red('El _id no es válido'));

        // Prueba con datos inválidos, por ejemplo un "CODIGO INTERNO" que ya exista (unique) o con un tipo erróneo
        try {
            await ProveedoresRepository.modificar_proveedores(_id, {
                "CODIGO INTERNO": 12345  // Asumiendo que ya existe y viola un constraint único
            });
            assert.fail(chalk.red('La función no lanzó un error con datos inválidos o repetidos'));
        } catch (err) {
            assert.ok(err instanceof Error, chalk.red('No se lanzó un error correctamente para datos inválidos'));
            console.log(chalk.yellow('Prueba PASADA: Manejo de datos inválidos en put_predios'));
        }

        console.log(chalk.green.bold('Prueba PASADA: put_predios\n'));

    } catch (err) {
        console.error(chalk.red.bold('Prueba FALLIDA: put_predios'));
        console.error(chalk.red(err.message));
        throw err;
    }
}
module.exports = {
    test_post_proveedores,
    test_get_proveedores,
    test_put_predios
}