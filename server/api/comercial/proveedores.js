import mongoose from "mongoose";
import { ProveedoresRepository } from "../../Class/Proveedores.js";
import { Seriales } from "../../Class/Seriales.js";
import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import { ComercialValidationsRepository } from "../../validations/Comercial.js";

export class ProveedoresCrontroller {
    static async get_comercial_proveedores_elementos(req) {
        return await executeQueryTask(async () => {
            const { data, user } = req || {};
            if (!user || !user._id) {
                throw new Error("Usuario no autenticado")
            }

            const { page, filtro } = data || {}
            const resultsPerPage = 25;
            let filter
            let query

            if (filtro) {
                ComercialValidationsRepository
                    .val_comercial_proveedores_informacion_proveedores_cantidad_datos(filtro);
                filter = ComercialValidationsRepository
                    .query_comercial_proveedores_informacion_proveedores_cantidad_datos(filtro);

                if (user.Rol > 2) {
                    filter = {
                        ...filter,
                        activo: true
                    }
                }

                query = {
                    skip: (page - 1) * resultsPerPage,
                    limit: resultsPerPage,
                    query: filter,
                }
            } else {
                query = {
                    limit: resultsPerPage
                }
            }


            const registros = await ProveedoresRepository.get_proveedores(query)

            return registros
        });
    }
    static async post_comercial_proveedores_add_proveedor(req) {
        const { user } = req
        if (!user || !user._id) {
            throw new Error("Usuario no autenticado")
        }
        await executeTransactionalTask(req, async (session, log) => {
            const data = ComercialValidationsRepository.val_proveedores_informacion_post_put_data().parse(req.data.data)
            const predio = await ProveedoresRepository.get_data({
                query: { "CODIGO INTERNO": 0 }
            }, { session })
            if (predio.length <= 0) {
                throw new Error("No se encontró el proveedor base con 'CODIGO INTERNO: 0' para obtener el precio")
            }
            if (predio[0].precio === undefined || predio[0].precio === null) {
                throw new Error("El proveedor base no tiene un precio definido")
            }
            const serial = await Seriales.modificar_seriales({ name: "Proveedor" }, { $inc: { serial: 1 } }, { session })
            if (!serial || typeof serial.serial !== "number") {
                throw new Error("Error al obtener serial")
            }

            const nuevoPredioConPrecio = {
                ...data,
                precio: predio[0].precio,
                user: user._id,
                "CODIGO INTERNO": serial.serial
            }

            // Se crea el registro
            await ProveedoresRepository.post_data(nuevoPredioConPrecio, { session, user: user._id });
        })
    }
    static async put_comercial_proveedores_modify_proveedor(req) {
        await executeTransactionalTask(req, async (session, log) => {
            const { user } = req
            if (!user || !user._id) {
                throw new Error("Usuario no autenticado")
            }
            delete req.data.data["CODIGO INTERNO"];

            const data = ComercialValidationsRepository.val_proveedores_informacion_post_put_data().parse(req.data.data)
            const { _id } = req.data
            if (!mongoose.isValidObjectId(_id)) {
                throw new Error("Id invalido")
            }

            // Crear una copia de los datos validados sin el campo flete
            const dataWithoutFlete = { ...data };
            delete dataWithoutFlete.flete;

            //usa dataWithoutFlete en lugar de data
            const newProveedor = await ProveedoresRepository.actualizar_data(
                { _id: _id },
                { $set: dataWithoutFlete },
                { session }
            );

            if (!newProveedor) {
                throw new Error("Error al modificar el proveedor")
            }

            return newProveedor
        })
    }
}