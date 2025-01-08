
const { connectProcesoDB } = require("../DB/mongoDB/config/config");
const { defineproveedores } = require("../DB/mongoDB/schemas/proveedores/schemaProveedores");

async function modificar_proveedores_new_ggn_tipoFruta() {
    try {
        const db = await connectProcesoDB()
        const Proveedor = await defineproveedores(db);
        const proveedores = await Proveedor.find().exec();

        for (const item of proveedores) {
            const tipoFruta = []

            if (item.N) tipoFruta.push('Naranja');
            if (item.L) tipoFruta.push('Limon');
            if (item.M) tipoFruta.push('Mandarina');


            if (!Object.prototype.hasOwnProperty.call(item._doc, 'GGN')) {
                item.GGN = {
                    code: null,
                    fechaVencimiento: null,
                    paises: [],
                    tipo_fruta: []
                }
            }

            if (!item.GGN.code) {
                console.log(item.GGN.code);

                item.GGN = {
                    ...item.GGN,
                    code: null,
                    fechaVencimiento: null
                }
                console.log(item.GGN);

            }


            // Eliminar campos que no necesitas
            const updateData = {
                ...item._doc,
                tipo_fruta: tipoFruta
            };
            delete updateData.N;
            delete updateData.L;
            delete updateData.M;
            delete updateData['FECHA VENCIMIENTO GGN'];

            const unsetFields = {
                N: "",
                L: "",
                M: "",
                "FECHA VENCIMIENTO GGN": ''
            };




            // Actualizar y eliminar campos al mismo tiempo
            await Proveedor.findByIdAndUpdate(item._id, {
                $set: updateData,   // Añadir o actualizar tipo_fruta
                $unset: unsetFields // Eliminar N, L y M
            }, {
                new: true,  // Retorna el documento actualizado
                runValidators: true
            });

        }

        await db.close();
    } catch (err) {
        console.log(err.message)
    }

}


modificar_proveedores_new_ggn_tipoFruta();
