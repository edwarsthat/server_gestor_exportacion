const { DataLogicError } = require("../../Error/logicLayerError")
const { ClientesRepository } = require("../Class/Clientes")
const { ConstantesDelSistema } = require("../Class/ConstantesDelSistema")
// const { ContenedoresRepository } = require("../Class/Contenedores")
const { LotesRepository } = require("../Class/Lotes")
const { UsuariosRepository } = require("../Class/Usuarios")


class dataRepository {
    static async get_data_clientes() {
        try {
            const clientes = await ClientesRepository.get_clientes({
                select: { CLIENTE: 1, CODIGO: 1 }
            })
            return clientes
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new DataLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_data_cargos(req) {
        try {
            const { user } = req
            const cargo = await UsuariosRepository.get_cargos({
                ids: [user.cargo]
            })
            const cargos = await UsuariosRepository.get_cargos({
                query: {
                    Rol: {
                        $gt: cargo[0].Rol
                    }
                },
                select: { Cargo: 1 }
            });
            return [...cargo, ...cargos]
        } catch (err) {
            if (
                err.status === 522
            ) {
                throw err
            }
            throw new DataLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_data_tipoFruta() {
        try {
            const tipoFrutas = await ConstantesDelSistema.get_constantes_sistema_tipo_frutas()
            return tipoFrutas
        } catch (err) {
            if (
                err.status === 522
            ) {
                throw err
            }
            throw new DataLogicError(480, `Error ${err.type}: ${err.message}`)
        }

    }
    static async get_data_historicos_para_modelo_python(req) {
        try {
            const { data } = req.data

            if (!data || !Array.isArray(data) || data.length === 0) {
                throw new DataLogicError(400, "No se enviaron proveedores válidos.");
            }

            const requestProv = data.map(prov => prov._id);
            const lotes = await LotesRepository.get_Lotes_strict({
                query: {
                    predio: {
                        $in: requestProv
                    }
                },
                select: {
                    calidad1: 1, calidad2: 1, calidad15: 1, kilos: 1,
                    contenedores: 1, descarteLavado: 1, descarteEncerado: 1,
                    deshidratacion: 1, fecha_creacion: 1, tipoFruta: 1, predio: 1
                },
                limit: "all"
            })

            // const clientesRaw = lotes.map(lote => lote.contenedores);
            // const clientesFlat = clientesRaw.flat();
            // const clientes = [...new Set(clientesFlat)];


            // const contenedores = await ContenedoresRepository.get_Contenedores_sin_lotes_strict({
            //     query: {
            //         _id: {
            //             $in: clientes
            //         }
            //     },
            //     select: {
            //         pallets: 1
            //     }
            // })
            console.log(lotes.length)
            return {
                lotes,
                contenedores: []
            }

        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new DataLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
}

module.exports.dataRepository = dataRepository

