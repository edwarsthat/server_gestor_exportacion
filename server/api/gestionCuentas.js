const { GestionCuentasLogicError } = require("../../Error/logicLayerError");
const { RecordDeleteRepository } = require("../archive/ArchiveDelete");
const { RecordModificacionesRepository } = require("../archive/ArchivoModificaciones");
const { UsuariosRepository } = require("../Class/Usuarios");

class gestionCuentasRepository {
    static async get_gestionCuentas_cargos(req) {
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
                }
            });
            return [...cargo, ...cargos]
        } catch (err) {
            if (
                err.status === 522
            ) {
                throw err
            }
            throw new GestionCuentasLogicError(460, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_gestionCuentas_cargos(req) {
        try {
            const { user } = req;
            const { action, cargo } = req.data;
            const { _id } = cargo;

            const cargoActual = await UsuariosRepository.get_cargos({
                ids: [_id]
            })

            const newCargo = await UsuariosRepository.actualizar_cargo(
                { _id },
                { $set: cargo }
            )

            await RecordModificacionesRepository.post_record_modification(
                action,
                user,
                {
                    modelo: "Cargo",
                    documentoId: _id,
                    descripcion: `Se modifico el cargo ${newCargo.cargo}`,
                },
                cargoActual[0],
                newCargo,
                { cargo, action }
            );
        } catch (err) {
            if (
                err.status === 523
            ) {
                throw err
            }
            throw new GestionCuentasLogicError(460, `Error ${err.type}: ${err.message}`)
        }
    }
    static async delete_gestionCuentas_cargos(req) {
        try {
            const { user } = req
            const { _id, action } = req.data

            const elementoEliminado = await UsuariosRepository.eliminar_cargo({ _id })

            const documento = {
                modelo: "Cargo",
                _id: _id,
            }
            await RecordDeleteRepository.post_record_eliminados(
                action,
                user,
                documento,
                elementoEliminado,
                `Se elimina el cargo ${elementoEliminado.cargo}`
            )

        } catch (err) {
            if (
                err.status === 527
            ) {
                throw err
            }
            throw new GestionCuentasLogicError(460, `Error ${err.type}: ${err.message}`)
        }
    }
}

module.exports.gestionCuentasRepository = gestionCuentasRepository
