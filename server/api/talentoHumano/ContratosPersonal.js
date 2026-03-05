import { ContratosPersonalRepository } from "../../Class/talentoHumano/ContratosPersonal.js";
import { ErrorTalentHumanoLogicHandlers } from "../utils/errorsHandlers.js";

export class ContratosPersonalControllerRepository {

    static async post_talentoHumano_contratosPersonal(req) {
        try {

            const { data } = req.data;

            const contrato = await ContratosPersonalRepository.post_data(data);

            return contrato;

        } catch (error) {
            await ErrorTalentHumanoLogicHandlers(error);
        }
    }

    static async get_talentoHumano_contratosPersonal_registros(req) {
        try {

            const { page, filtro } = req.data;

            const resultsPerPage = 25;

            const query = {
                estadoActual: filtro?.activo ?? true
            };

            const data = await ContratosPersonalRepository.get_data({
                query,
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                populate: [
                    { path: "cargo", select: "nombre" }
                ]
            });

            return data;

        } catch (error) {
            await ErrorTalentHumanoLogicHandlers(error);
        }
    }

    static async get_talentoHumano_contratosPersonal_numeroRegistros(req) {
        try {

            const { filtro } = req.data;

            const query = {
                estadoActual: filtro?.activo ?? true
            };

            const total = await ContratosPersonalRepository.get_numero_registros(query);

            return total;

        } catch (error) {
            await ErrorTalentHumanoLogicHandlers(error);
        }
    }

    static async put_talentoHumano_contratosPersonal(req) {
        try {

            const { _id, data } = req.data;

            const contrato = await ContratosPersonalRepository.actualizar_data(
                { _id },
                data
            );

            return contrato;

        } catch (error) {
            await ErrorTalentHumanoLogicHandlers(error);
        }
    }

}