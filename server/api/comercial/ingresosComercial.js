import { executeTransactionalTask } from "../../utils/wrappers.js";
import { ComercialValidationsRepository } from "../../validations/Comercial.js";
import { ComercialService } from "../../services/comercial.js";
import { ContenedoresRepository } from "../../Class/Contenedores.js";
import { dataRepository } from "../data.js";


export class IngresosComercialController {
    static async post_comercial_contenedor(req) {
        const { user } = req
        if (!user || !user._id) {
            throw new Error("Usuario no autenticado")
        }
        await executeTransactionalTask(req, async (session) => {
            const { data } = ComercialValidationsRepository.post_comercial_contenedor().parse(req.data);
            const ordenCompra = await dataRepository.incrementar_serial("ordenCompra", session);
            const objCont = ComercialService.crear_contenedor({ ...data, ordenCompra })
            if (!objCont) {
                throw new Error("Error al crear el contenedor")
            }
            await ContenedoresRepository.post_data(objCont, { session, user: user._id });
        })
    }
}
