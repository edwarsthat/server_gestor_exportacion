
const fs = require('fs');
const path = require('path');
const yaml = require("js-yaml");
const { startOfDay, parse, endOfDay } = require('date-fns');

const { UsuariosRepository } = require('../Class/Usuarios');
const bcrypt = require('bcrypt');
const { UserRepository } = require('../auth/users');
const { ValidationUserError } = require('../../Error/ValidationErrors');
const { InsumosRepository } = require('../Class/Insumos');
const { ConstantesDelSistema } = require('../Class/ConstantesDelSistema');
const { ProcessError } = require('../../Error/ProcessError');

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
    static async get_users(req, user) {
        const cargo = await UsuariosRepository.get_cargos({
            ids: [user.cargo]
        })
        const { page, cargoFilter } = req
        const resultsPerPage = 50;

        const query = {
            skip: (page - 1) * resultsPerPage,
            limit: resultsPerPage,
            sort: { createdAt: -1 }
        }

        if (cargoFilter !== '') {
            query.query = {
                cargo: cargoFilter
            }
        }

        const usuarios = await UsuariosRepository.get_users(query);
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

        await UsuariosRepository.modificar_usuario(_id, query, action, user.user, __v);
    }
    static async modificar_usuario(req, user) {
        const { action, data, _id, __v } = req
        await UsuariosRepository.modificar_usuario(_id, data, action, user.user, __v);
    }
    static async obtener_operarios_seleccionadoras() {
        const usuarios = await UsuariosRepository.get_users({
            query: { estado: true, cargo: "66bfbd0e281360363ce25dfc" }
        });
        // const resultado = usuarios.filter(usuario => usuario.cargo.Rol >)
        return usuarios
    }
    static async obtener_operarios_higiene() {
        const usuarios = await UsuariosRepository.get_users({
            query: {
                estado: true,
                $or: [
                    { cargo: "66bfbd0e281360363ce25dfc" },
                    { cargo: "66bf8a99281360363ce252be" },
                    { cargo: "66bf8ab6281360363ce252c7" },
                    { cargo: "66bf8ad5281360363ce252d0" },
                    { cargo: "66bf8e40281360363ce25353" },
                    { cargo: "66c513dcb7dca1eebff39a96" }
                ]
            },
            getAll: true,
        });
        return usuarios
    }
    static async add_volante_calidad(req, user) {
        const { data } = req
        const volante_calidad = {
            ...data,
            responsable: user._id
        }
        await UsuariosRepository.add_volante_calidad(volante_calidad)
    }
    static async add_higiene_personal(req, user) {
        const { data } = req
        const higienePersonal = {
            ...data,
            responsable: user._id
        }
        await UsuariosRepository.add_higiene_personal(higienePersonal)
    }
    static async obtener_volante_calidad(data) {
        const { tipoFruta, fechaInicio, fechaFin } = data;
        let query = {}
        if (tipoFruta !== '') {
            query.tipoFruta = tipoFruta
        }
        if (fechaInicio) {
            const localDate = parse(fechaInicio, 'yyyy-MM-dd', new Date())
            const inicio = startOfDay(localDate);

            query.fecha = { $gte: inicio };
        } else {
            const inicio = new Date(0);

            query.fecha = { $gte: inicio };
        }
        if (fechaFin) {
            const localDate = parse(fechaFin, 'yyyy-MM-dd', new Date());
            const fin = endOfDay(localDate);
            query.fecha = { ...query.fecha, $lte: fin };
        } else {
            const fin = new Date()
            query.fecha = { ...query.fecha, $lte: fin };
        }

        const volanteCalidad = await UsuariosRepository.obtener_volante_calidad({
            query: query
        });
        return volanteCalidad
    }
    static async obtener_formularios_higiene_personal(data) {
        const { tipoFruta, fechaInicio, fechaFin } = data;
        let query = {}
        if (tipoFruta !== '') {
            query.tipoFruta = tipoFruta
        }
        if (fechaInicio) {
            const localDate = parse(fechaInicio, 'yyyy-MM-dd', new Date())
            const inicio = startOfDay(localDate);

            query.fecha = { $gte: inicio };
        } else {
            const inicio = new Date(0);

            query.fecha = { $gte: inicio };
        }
        if (fechaFin) {
            const localDate = parse(fechaFin, 'yyyy-MM-dd', new Date());
            const fin = endOfDay(localDate);
            query.fecha = { ...query.fecha, $lte: fin };
        } else {
            const fin = new Date()
            query.fecha = { ...query.fecha, $lte: fin };
        }

        const volanteCalidad = await UsuariosRepository.obtener_formularios_higiene_personal({
            query: query
        });
        return volanteCalidad
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

        return { usuario: user[0].usuario, cargo: user[0].cargo, _id: user[0]._id, }

    }
    static async isNewVersion() {
        const apkLatest = path.join(__dirname, '..', '..', 'updates', 'desktop', 'latest.yml');
        const fileContents = fs.readFileSync(apkLatest, 'utf8');
        return fileContents
    }
    static async getCelifrutAppFile(filename) {
        const filePath = path.join(__dirname, '..', '..', 'updates', 'desktop', filename);
        const fileContents = fs.readFileSync(filePath);
        return fileContents
    }
    static async obtener_tipo_insumos() {
        const insumos = await InsumosRepository.get_insumos()
        return insumos
    }
    static async modificar_tipo_insumo(req, user) {
        const { data, action } = req
        await InsumosRepository.modificar_insumo(
            data._id,
            data,
            action,
            user,
        )
    }
    static async add_tipo_insumo(req, user) {
        const { data } = req;
        await InsumosRepository.add_tipo_insumo(data, user)
    }
    static async obtener_info_mi_cuenta(user) {
        const { _id } = user
        const usuario = await UsuariosRepository.get_users({
            ids: [_id]
        })
        delete usuario.password
        return usuario[0]
    }
    static async modificar_mi_password(req, user) {
        console.log(req)
        const { data, action } = req
        const { _id } = user
        const hashedPassword = await bcrypt.hash(data, 10);
        const query = {
            password: hashedPassword
        }
        await UsuariosRepository.modificar_usuario(_id, query, action, user);


    }
    static async obtener_cantidad_usuarios() {
        const cantidad = await UsuariosRepository.obtener_cantidad_usuarios()
        return cantidad
    }

    //#region get
    static async get_constantes_sistema_tipo_frutas() {
        try {
            const response = await ConstantesDelSistema.get_constantes_sistema_tipo_frutas();
            return response
        } catch (err) {

            if (err.status === 540) {
                throw err
            }
            throw new ProcessError(490, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_constantes_sistema_paises_GGN() {
        try {
            const response = await ConstantesDelSistema.get_constantes_sistema_paises_GGN();
            return response
        } catch (err) {

            if (err.status === 540) {
                throw err
            }
            throw new ProcessError(490, `Error ${err.type}: ${err.message}`)
        }
    }
}

module.exports.SistemaRepository = SistemaRepository
