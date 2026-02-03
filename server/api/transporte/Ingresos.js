import { VehiculoRegistro } from "../../Class/VehiculosRegistros.js";
import { executeQueryTask } from "../../utils/wrappers.js";

export class TransporteIngresosController {
    static async get_transporte_contenedores_entregaPrescinto() {
        return await executeQueryTask(async () => {
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - 30);

            const response = await VehiculoRegistro.getRegistrosVehiculo({
                query: {
                    "fecha": { $gte: fechaLimite },
                    entregaPrecinto: { $exists: false },
                    tipoSalida: "Exportacion",
                }
            });
            return response;
        })
    }
}