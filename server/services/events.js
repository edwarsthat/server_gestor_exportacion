import { FrutaProcesada } from "../Class/frutaProcesada.js";
import { TurnoDatarepository } from "../Class/TurnoData.js";
import { IndicadoresRepository } from "../Class/Indicadores.js";


export class EventsService {

    static async _snapshotPredioProcesando() {
        const registro = await FrutaProcesada.obtener_ultimaEntrada();
        if (!registro) return null;

        return {
            predio: registro.predio?.PREDIO,
            lote: registro.loteId?.enf,
            tipoFruta: registro.tipoFruta?.tipoFruta,
        };
    }

    static async _snapshotHoraInicioTurno() {
        const registros = await TurnoDatarepository.get_data({
            sort: { createdAt: -1 },
            limit: 1,
            select: { horaInicio: 1 },
        });

        const turno = registros[0];
        if (!turno?.horaInicio) return null;

        return {
            horaInicio: turno.horaInicio,
        };
    }
    static async _snapshotIndicadores() {
        const registros = await IndicadoresRepository.get_data({
            sort: { fecha_creacion: -1 },
            limit: 1,
            select: { kilos_procesados: 1, kilos_exportacion: 1 },
            lean: true,
        })
        if (!registros[0]) return null;

        const kilos = Object.values(registros[0].kilos_procesados).reduce((a, b) => (a || 0) + (b || 0), 0);

        const kilosExportacion = Object.values(registros[0].kilos_exportacion)
            .flatMap(nivel1 => Object.values(nivel1))
            .flatMap(nivel2 => Object.values(nivel2))
            .reduce((acc, valor) => acc + (Number(valor) || 0), 0);

        return {
            kilos_procesados: kilos,
            kilos_exportacion: kilosExportacion,
        }
    }
}

