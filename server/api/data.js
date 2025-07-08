import { DataLogicError } from "../../Error/logicLayerError.js";
import { ClientesRepository } from "../Class/Clientes.js";
import { ConstantesDelSistema } from "../Class/ConstantesDelSistema.js";
import { LotesRepository } from "../Class/Lotes.js";
import { ProveedoresRepository } from "../Class/Proveedores.js";
import { UsuariosRepository } from "../Class/Usuarios.js";
import { dataService } from "../services/data.js";
import { CuartosDesverdizados } from "../store/CuartosDesverdizados.js";


export class dataRepository {
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

            const type = err?.type || "desconocido";
            const message = err?.message || "Error inesperado";

            throw new DataLogicError(480, `Error ${type}: ${message}`);
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
    static async get_data_clientesNacionales() {
        try {
            const clientesNacionales = await ClientesRepository.get_clientesNacionales({
                select: { cliente: 1, canastillas: 1 }
            })
            return clientesNacionales
        } catch (err) {
            console.log(err)
            if (
                err.status === 522
            ) {
                throw err
            }

            const type = err?.type || "desconocido";
            const message = err?.message || "Error inesperado";

            throw new DataLogicError(480, `Error ${type}: ${message}`);
        }
    }
    static async get_data_proveedores(req) {
        const { data } = req.data;
        let query
        try {

            if (data === 'activos') {
                query = {
                    query: { activo: true },
                    limit: 'all',
                    select: {
                        PREDIO: 1,
                        'ICA.code': 1,
                        SISPAP: 1,
                        GGN: 1,
                        "CODIGO INTERNO": 1,
                        canastillas: 1
                    }
                }
            } else if (data === 'all') {
                query = {
                    limit: 'all',
                    select: { PREDIO: 1, 'ICA.code': 1, SISPAP: 1, GGN: 1, "CODIGO INTERNO": 1 }
                }
            } else {
                throw new Error("Error en los parametros de busqueda")
            }

            return await ProveedoresRepository.get_proveedores(query);
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new DataLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_data_cuartosDesverdizados() {
        try {
            console.log("get_data_cuartosDesverdizados")
            return await CuartosDesverdizados.get_cuartosDesverdizados();
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new DataLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_data_EF8() {
        try {
            
            const EF8 = await dataService.get_ef8_serial();
            return EF8
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new DataLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
}


