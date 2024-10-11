const { ContenedoresRepository } = require("../Class/Contenedores");
const { LotesRepository } = require("../Class/Lotes")

class ViewsRepository {
    static async view_lotes(req) {
        const {
            tipoFruta,
            predio,
            enf,
            fechaInicio,
            fechaFin,
            rendimientoMin,
            rendimientoMax,
            limit,
            todosLosDatos,
            busqueda,
            umbralMin,
            umbralMax,
            criterio
        } = req;
        const query = {}

        let sort = { fechaIngreso: -1 };
        if (tipoFruta) query.tipoFruta = tipoFruta;
        if (predio) query.predio = predio;
        if (enf) query.enf = enf;

        if (fechaInicio || fechaFin) {
            query.fechaIngreso = {}
            if (fechaInicio) {
                const fechaInicioUTC = new Date(fechaInicio);
                fechaInicioUTC.setHours(fechaInicioUTC.getHours() + 5);
                query.fechaIngreso.$gte = fechaInicioUTC;
            } else {
                query.fechaIngreso.$gte = new Date(0);
            }
            if (fechaFin) {
                const fechaFinUTC = new Date(fechaFin)
                fechaFinUTC.setDate(fechaFinUTC.getDate() + 1);
                fechaFinUTC.setHours(fechaFinUTC.getHours() + 5);
                query.fechaIngreso.$lt = fechaFinUTC;
            } else {
                query.fechaIngreso.$lt = new Date();
            }
        }
        if (rendimientoMin || rendimientoMax) {
            query.rendimiento = {}
            if (rendimientoMin) {
                query.rendimiento.$gte = Number(rendimientoMin)
            } else {
                query.rendimiento.$gte = -50
            }
            if (rendimientoMax) {
                query.rendimiento.$lt = Number(rendimientoMax)
            } else {
                query.rendimiento.$lt = 150
            }
        }
        let cantidad = 50
        if (limit) cantidad = limit

        //busqueda calidad
        if (criterio) {
            sort = {}
            sort[`calidad.calidadInterna.${criterio}`] = -1
        }
        if (criterio && (umbralMin || umbralMax)) {
            query[`calidad.calidadInterna.${criterio}`] = {}
            if (umbralMin) {
                query[`calidad.calidadInterna.${criterio}`].$gte = Number(umbralMin)
            } else {
                query[`calidad.calidadInterna.${criterio}`].$gte = -50
            }
            if (umbralMax) {
                query[`calidad.calidadInterna.${criterio}`].$lt = Number(umbralMax)
            } else {
                query[`calidad.calidadInterna.${criterio}`].$lt = 999999999
            }
        }
        const lotes = await LotesRepository.getLotes({
            query: query,
            limit: todosLosDatos ? 99999999999 : cantidad,
            sort: sort
        });
        const contenedoresArr = []
        if (busqueda === 'calidad') {
            return lotes
        } else {
            lotes.forEach(element => {
                element.contenedores.forEach(contenedor => contenedoresArr.push(contenedor))
            })
            const contenedoresSet = new Set(contenedoresArr)
            const cont = [...contenedoresSet]

            const contenedores = await ContenedoresRepository.getContenedores({
                ids: cont,
                select: { numeroContenedor: 1 }
            });

            return { lotes: lotes, contenedores: contenedores }
        }

    }
}

module.exports.ViewsRepository = ViewsRepository
