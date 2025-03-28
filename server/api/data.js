const { DataLogicError } = require("../../Error/logicLayerError")
const { ClientesRepository } = require("../Class/Clientes")
const { ConstantesDelSistema } = require("../Class/ConstantesDelSistema")
const { UsuariosRepository } = require("../Class/Usuarios")


class dataRepository {
    static async get_data_clientes() {
        try {
            const clientes = await ClientesRepository.get_clientes({
                select: { CLIENTE: 1 }
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
}

module.exports.dataRepository = dataRepository

