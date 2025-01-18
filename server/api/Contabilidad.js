const { LotesRepository } = require("../Class/Lotes");

class ContabilidadRepository {
    static async obtener_lotes_contabilidad_informes_calidad(data) {
        const { page } = data;
        const resultsPerPage = 50;
        const query = {
            enf: { $regex: '^E', $options: 'i' },
            aprobacionComercial: true
        }
        const lotes = await LotesRepository.getLotes({
            query: query,
            skip: (page - 1) * resultsPerPage,
            select: {
                enf: 1,
                tipoFruta: 1,
                calidad: 1,
                __v: 1,
                deshidratacion: 1,
                kilos: 1,
                contenedores: 1,
                calidad1: 1,
                calidad15: 1,
                calidad2: 1,
                descarteEncerado: 1,
                descarteLavado: 1,
                frutaNacional: 1,
                fechaIngreso: 1,
                precio: 1,
                aprobacionComercial: 1,
                exportacionDetallada: 1,
                observaciones: 1,
                flag_is_favorita: 1,
                flag_balin_free: 1,
                fecha_ingreso_patio: 1,
                fecha_salida_patio: 1,
                fecha_ingreso_inventario: 1,
                fecha_creacion: 1,
                fecha_estimada_llegada: 1,

            },
            limit: resultsPerPage,
            populate: { path: 'predio', select: 'PREDIO ICA DEPARTAMENTO GGN precio' }

        })
        return lotes
    }
}

module.exports.ContabilidadRepository = ContabilidadRepository