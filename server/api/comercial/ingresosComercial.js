import { executeTransactionalTask } from "../../utils/wrappers.js";
import { ComercialValidationsRepository } from "../../validations/Comercial.js";
import { ComercialService } from "../../services/comercial.js";
import { ContenedoresRepository } from "../../Class/Contenedores.js";
import { dataRepository } from "../data.js";
import { contenedorEmitter } from "../../../events/emitters.js";


export class IngresosComercialController {
    static async post_comercial_contenedor(req) {
        const { user } = req
        if (!user || !user._id) {
            throw new Error("Usuario no autenticado")
        }
        await executeTransactionalTask(req, async (session) => {
            const { data } = ComercialValidationsRepository.post_comercial_contenedor().parse(req.data);
            const serial = await dataRepository.incrementar_serial("ordenCompra", session);
            const objCont = ComercialService.crear_contenedor({ ...data, ordenCompra: serial })
            if (!objCont) {
                throw new Error("Error al crear el contenedor")
            }
            const contenedor = await ContenedoresRepository.post_data(objCont, { session, user: user._id });
            await contenedor.populate([
                { path: "infoContenedor.tipoFruta", select: "tipoFruta" },
                { path: "infoContenedor.clienteInfo", select: "CLIENTE" },
                { path: "infoContenedor.pais_destino", select: "nombre" },
            ]);
            contenedorEmitter.emit("crearOrdenCompra", {
                action: "post_comercial_contenedor",
                contenedor
            });
        })
    }
}
