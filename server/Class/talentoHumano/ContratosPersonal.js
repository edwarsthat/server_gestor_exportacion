// import ContratosPersonal from "../../Class/talentoHumano/CargosPersonal.js";
import ContratosPersonal from "../../../DB/mongoDB/schemas/gestionLaboral/schemaContratosPersonal.js";

export class ContratosPersonalRepository {

    static async post_data(data, options = {}) {
        const contrato = new ContratosPersonal(data);
        return await contrato.save(options);
    }

    static async get_data({
        query = {},
        ids = null,
        skip = 0,
        limit = 50,
        select = {},
        populate = []
    }, options = {}) {

        if (ids) {
            query._id = { $in: ids };
        }

        let consulta = ContratosPersonal
            .find(query)
            .skip(skip)
            .limit(limit)
            .select(select);

        populate.forEach(pop => {
            consulta = consulta.populate(pop);
        });

        if (options.session) {
            consulta = consulta.session(options.session);
        }

        return await consulta;
    }

    static async actualizar_data(query, data, options = {}) {
        const updateWithOperators = Object.keys(data).some(key => key.startsWith('$')) ? data : { $set: data };
        return await ContratosPersonal.findOneAndUpdate(
            query,
            updateWithOperators,
            {
                new: true,
                session: options.session
            }
        );
    }

    static async get_numero_registros(query = {}) {
        return await ContratosPersonal.countDocuments(query);
    }

}