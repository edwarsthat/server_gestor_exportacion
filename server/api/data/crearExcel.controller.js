import { PersonalRepository } from "../../Class/talentoHumano/Personal.js";
import { CrearDocumentosRepository } from "../../services/crearDocumentos.js";
import { executeQueryTask } from "../../utils/wrappers.js";
import { DataValidations } from "../../validations/data.js";

export class crearExcelController {
    static buildQueryConBusqueda(filtro) {
        const query = { estado: filtro.activo }
        if (filtro.buscar !== "") {
            const terminoNormalizado = filtro.buscar
                .trim()
                .replace(/\s+/g, ' ')
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                .replace(/ /g, '\\s+');

            const regexBusqueda = { $regex: terminoNormalizado, $options: 'i' };
            query.$or = [
                { nombre: regexBusqueda },
                { apellido: regexBusqueda },
                { identificacion: regexBusqueda }
            ];
        }
        return query
    }

    static async documento_personal(req) {
        return await executeQueryTask(async () => {
            const { filtro } = DataValidations.documento_personal().parse(req.data)
            const query = crearExcelController.buildQueryConBusqueda(filtro)

            const personal = await PersonalRepository.get_data({
                query: query,
                populate: [
                    { path: "cargo", select: "nombre" }
                ],
            })
            const buffer = await CrearDocumentosRepository.crear_tabla_personal(personal)
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

            return {
                file: arrayBuffer,
                filename: `personal_${Date.now()}.xlsx`,
                mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        })
    }
}