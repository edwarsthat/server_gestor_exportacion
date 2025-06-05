import bcrypt from 'bcrypt';
import { GestionCuentasLogicError } from "../../Error/logicLayerError.js";
import { RecordCreacionesRepository } from "../archive/ArchiveCreaciones.js";
import { RecordDeleteRepository } from "../archive/ArchiveDelete.js";
import { RecordModificacionesRepository } from "../archive/ArchivoModificaciones.js";
import { UsuariosRepository } from "../Class/Usuarios.js";
import { gestionCuentasValidationsRepository } from "../validations/gestionCuentas.js";

export class gestionCuentasRepository {
    //#region cargos
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
    static async post_gestionCuentas_cargo(req) {
        try {
            const { user } = req
            const { data: datos } = req.data

            const cargo = await UsuariosRepository.get_cargos({
                ids: [user.cargo],
                select: { Rol: 1 }
            })

            const data = { ...datos, Rol: (cargo[0].Rol + 1) }
            const Cargo = await UsuariosRepository.add_cargo(data, user)

            // Se crea el registro

            const documento = {
                modelo: "Cargo",
                _id: Cargo._id,
            }

            await RecordCreacionesRepository.post_record_creaciones(
                "post_gestionCuentas_cargo",
                user,
                documento,
                Cargo,
                "Creacion de cargo"
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
    //#endregion
    //#region usuarios
    static async get_gestionCuentas_usuarios(req) {
        try {
            const { user } = req
            const { page, filtro } = req.data || {}
            const resultsPerPage = 50;

            let query = {
                skip: (page - 1) * resultsPerPage,
            }
            let filter

            const cargo = await UsuariosRepository.get_cargos({
                ids: [user.cargo]
            })

            if (filtro) {
                filter = gestionCuentasValidationsRepository.query_gestionCuentas_obtener_usuarios(filtro)

                query = {
                    skip: (page - 1) * resultsPerPage,
                    query: filter
                }
            }
            const usuarios = await UsuariosRepository.get_users(query);

            const resultado = usuarios.filter(usuario => usuario.cargo.Rol > cargo[0].Rol)

            return resultado
        } catch (err) {
            if (err.status === 522) { throw err }
            throw new GestionCuentasLogicError(460, `Error ${err.type}: ${err.message}`)
        }
    }
    static async post_gestionCuentas_usuario(req) {
        try {
            const { user } = req
            const { data } = req.data
            const { password } = data

            const hashedPassword = await bcrypt.hash(password, 10);
            data.password = hashedPassword
            const usuario = await UsuariosRepository.add_user(data)

            const documento = {
                modelo: "usuario",
                _id: usuario._id,
            }

            await RecordCreacionesRepository.post_record_creaciones(
                "post_gestionCuentas_usuario",
                user,
                documento,
                usuario,
                "Creacion de usuario"
            )

        } catch (err) {
            if (err.status === 522) { throw err }
            throw new GestionCuentasLogicError(460, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_gestionCuentas_usuarioEstado(req) {
        try {
            const { data, user } = req;
            const { _id, action } = data;

            const oldUsuario = await UsuariosRepository.get_users({ ids: [_id] })

            const newUsuario = await UsuariosRepository.actualizar_usuario(
                { _id },
                {
                    $set: {
                        estado: oldUsuario[0].estado ? false : true
                    }
                }
            );

            await RecordModificacionesRepository.post_record_modification(
                action,
                user,
                {
                    modelo: "usuario",
                    documentoId: newUsuario._id,
                    descripcion: `Se modifico el estado del Usuario`,
                },
                oldUsuario[0],
                newUsuario,
                { _id, action }
            )
        } catch (err) {
            if (
                err.status === 523
            ) {
                throw err
            }
            throw new GestionCuentasLogicError(460, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_gestionCuentas_usuario(req) {
        try {
            const { user } = req;
            const { action, data, _id } = req.data

            const oldUsuario = await UsuariosRepository.get_users({ ids: [_id] })

            const newUsuario = await UsuariosRepository.actualizar_usuario(
                { _id },
                data
            );

            await RecordModificacionesRepository.post_record_modification(
                action,
                user,
                {
                    modelo: "usuario",
                    documentoId: newUsuario._id,
                    descripcion: `Se modifico el Usuario ${oldUsuario[0].usuario} con el _id = ${newUsuario._id}`,
                },
                oldUsuario[0],
                newUsuario,
                { action, data, _id }
            )

        } catch (err) {
            if (
                err.status === 523
            ) {
                throw err
            }
            throw new GestionCuentasLogicError(460, `Error ${err.type}: ${err.message}`)
        }
    }
}
