
const { connectProcesoDB } = require("../DB/mongoDB/config/config");
const { defineproveedores } = require("../DB/mongoDB/schemas/proveedores/schemaProveedores");

async function modificar_proveedores_new_ggn_tipoFruta() {
    try {
        const db = await connectProcesoDB("mongodb://localhost:27017/proceso")
        // const db = await connectProcesoDB("mongodb://admin:SwR7uJHy1cnDDH3zRVMKZFwLOvn3RQBl@localhost:27017/proceso?authSource=admin")

        const Proveedor = await defineproveedores(db);
        // const proveedores_temp = await Proveedor.find().exec();

        // for (const item of proveedores_temp) {
        //     console.log(item)
        //     item.ICA_temp = item.ICA

        //     await Proveedor.findByIdAndUpdate(item._id, {
        //         $set: item
        //     }, {
        //         new: true,  // Retorna el documento actualizado
        //         runValidators: true
        //     });
        // }



        const proveedores = await Proveedor.find().exec();

        for (const item of proveedores) {
            const tipoFruta = []

            item["CODIGO INTERNO"] = Number(item["CODIGO INTERNO"])


            const ICA = item.ICA_temp
            item.ICA = {
                code: ICA,
                tipo_fruta: []
            }
            console.log(item.N)
            if (item.N) {
                tipoFruta.Naranja = {
                    Arboles: 0,
                    Hectareas: 0,
                }
                item.ICA.tipo_fruta.push('Naranja')
            }
            if (item.L) {
                tipoFruta.Limon = {
                    Arboles: 0,
                    Hectareas: 0,
                }
                tipoFruta.push('Limon');
            }
            if (item.M) {
                tipoFruta.Mandarina = {
                    Arboles: 0,
                    Hectareas: 0,
                }
                item.ICA.tipo_fruta.push('Mandarina')
            }


            if (!Object.prototype.hasOwnProperty.call(item._doc, 'GGN')) {
                item.GGN = {
                    code: null,
                    fechaVencimiento: null,
                    paises: [],
                    tipo_fruta: []
                }
            }

            if (!item.GGN.code) {

                item.GGN = {
                    ...item.GGN,
                    code: null,
                    fechaVencimiento: null
                }
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
            delete updateData.ICA_temp;

            const unsetFields = {
                N: "",
                L: "",
                M: "",
                "FECHA VENCIMIENTO GGN": ''
            };
            console.log(updateData)

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
        console.log(err)
    }

}


modificar_proveedores_new_ggn_tipoFruta();
