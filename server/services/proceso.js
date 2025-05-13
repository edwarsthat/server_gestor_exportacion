const { ContenedoresRepository } = require("../Class/Contenedores");
const { LotesRepository } = require("../Class/Lotes");
const { ProcessError } = require("../../Error/ProcessError");
const calidadFile = require('../../constants/calidad.json');
const { deshidratacionLote, rendimientoLote } = require("../api/utils/lotesFunctions");
const { have_lote_GGN_export } = require("../controllers/validations");

class ProcesoService {
    static async getContenedorAndLote(loteID, ContenedorID) {
        // Validar que se proporcionaron los IDs necesarios
        if (!loteID || !ContenedorID) {
            throw new ProcessError(400, "Se requieren tanto el ID del lote como el ID del contenedor");
        }

        //se obtienen los datos
        const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
            ids: [ContenedorID],
            select: { infoContenedor: 1, pallets: 1 },
            populate: {
                path: 'infoContenedor.clienteInfo',
                select: 'CLIENTE PAIS_DESTINO',
            }
        });

        // Validar que se encontró el contenedor y tiene la estructura esperada
        if (!contenedor || contenedor.length === 0) {
            throw new ProcessError(404, `No se encontró el contenedor con ID: ${ContenedorID}`);
        }

        if (!contenedor[0].infoContenedor || !contenedor[0].pallets) {
            throw new ProcessError(500, `El contenedor ${ContenedorID} no tiene la estructura de datos esperada`);
        }

        //se obtiene el lote
        const lotes = await LotesRepository.getLotes({
            ids: [loteID]
        });

        // Validar que se encontró el lote
        if (!lotes || lotes.length === 0) {
            throw new ProcessError(404, `No se encontró el lote con ID: ${loteID}`);
        }

        return { contenedor, lotes };
    }
    static async modificarSumarItemCopiaPallet(palletSeleccionado, item, lotes) {
        const { lote, calibre, calidad, cajas } = item
        const index = palletSeleccionado.findIndex(data =>
            data.lote === lote &&
            data.calidad === calidad &&
            data.calibre === calibre
        )
        if (index === -1) {
            const itemnuevo = {
                ...item,
                SISPAP: lotes[0].predio.SISPAP,
            }
            palletSeleccionado.push(itemnuevo)

        } else {
            palletSeleccionado[index].cajas += cajas

        }
    }
    static async crearQueryLoteIngresoItemListaEmpaque(item, loteModificado, _id, contenedor) {
        const { cajas, calidad } = item
        //modificar el predio
        const kilos = Number(item.tipoCaja.split('-')[1].replace(",", ".")) * cajas

        //se guarda el registro
        const antes = {
            [calidadFile[calidad]]: loteModificado[calidadFile[calidad]],
            deshidratacion: loteModificado.deshidratacion,
            rendimiento: loteModificado.rendimiento,
        }
        loteModificado[calidadFile[calidad]] += kilos
        loteModificado.deshidratacion = await deshidratacionLote(loteModificado)
        loteModificado.rendimiento = await rendimientoLote(loteModificado)

        const query = {
            $inc: {
                [calidadFile[calidad]]: kilos,
            },
            $addToSet: { contenedores: _id },
            deshidratacion: loteModificado.deshidratacion,
            rendimiento: loteModificado.rendimiento,
        }

        if (have_lote_GGN_export(loteModificado.predio, contenedor[0], item)) {
            query.$inc.kilosGGN = kilos
            antes.kilosGGN = loteModificado.kilosGGN
        }


        return { query, antes, kilos: kilos }
    }
}

module.exports.ProcesoService = ProcesoService; 