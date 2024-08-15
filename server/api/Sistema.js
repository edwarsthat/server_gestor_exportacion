
const fs = require('fs');
const path = require('path');
const yaml = require("js-yaml");
const { UsuariosRepository } = require('../Class/Usuarios');
const bcrypt = require('bcrypt');
const { UserRepository } = require('../auth/users');
const { ValidationUserError } = require('../../Error/ValidationErrors');

class SistemaRepository {
    static async check_mobile_version() {
        const apkLatest = path.join(__dirname, '..', '..', 'updates', 'mobile', 'latest.yml');
        const fileContents = fs.readFileSync(apkLatest, 'utf8');
        const latest = yaml.load(fileContents);
        return latest;
    }
    static async download_mobilApp(data) {
        const apkPath = path.join(__dirname, '..', '..', 'updates', 'mobile', data);
        // Verificar si el archivo existe
        if (!fs.existsSync(apkPath)) {
            throw { status: 404, message: 'File not found' };
        }
        return apkPath;
    }
    static async get_cargos(user) {
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

    }
    static async add_cargo(req, user) {
        const cargo = await UsuariosRepository.get_cargos({
            ids: [user.cargo],
            select: { Rol: 1 }
        })

        const data = { ...req, Rol: (cargo[0].Rol + 1) }
        await UsuariosRepository.add_cargo(data, user)
    }
    static async modificar_cargo(data, user) {
        const { action, cargo } = data;
        const { _id } = cargo;
        cargo.__v += 1
        await UsuariosRepository.modificar_cargo(_id, cargo, action, user.user)
    }
    static async eliminar_cargo(req, user) {
        const { _id } = req
        await UsuariosRepository.eliminar_cargo(_id, user.user)
    }
    static async get_users(user) {
        const cargo = await UsuariosRepository.get_cargos({
            ids: [user.cargo]
        })
        const usuarios = await UsuariosRepository.get_users();
        const resultado = usuarios.filter(usuario => usuario.cargo.Rol > cargo[0].Rol)
        return resultado
    }
    static async add_user(req, user) {
        const hashedPassword = await bcrypt.hash(req.password, 10);
        req.password = hashedPassword
        await UsuariosRepository.add_user(req, user)
    }
    static async desactivar_user(data, user) {
        const { _id, __v, action } = data;
        const query =
            [{
                $set: {
                    estado: { $not: "$estado" }
                }
            }]

        await UsuariosRepository.modificar_ususario(_id, query, action, user.user, __v);
    }
    static async modificar_usuario(req, user) {
        const { action, data, _id, __v } = req
        await UsuariosRepository.modificar_ususario(_id, data, action, user.user, __v);
    }
    static async login2(data) {
        await UserRepository.validate_userName(data);
        await UserRepository.validate_password(data);
        const user = await UsuariosRepository.get_users({
            query: { usuario: data.user, estado: true }
        })
        if (!user[0]) throw new ValidationUserError(401, "Error usuario no encontrado");
        const isValid = await bcrypt.compare(data.password, user[0].password);
        if (!isValid) throw new ValidationUserError(402, "Contraseña incorrecta");

        return { usuario: user[0].usuario, cargo: user[0].cargo }

    }


}

module.exports.SistemaRepository = SistemaRepository
