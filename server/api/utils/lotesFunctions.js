import { ProcessError } from "../../../Error/ProcessError.js";



async function rendimientoLote(data) {
    /**
     * Calcula y guarda el rendimiento del lote como el porcentaje
     * de kilos en exportación sobre kilos vaciados.
     *
     * @param {object} data - Información del lote
     * @return {number} - Rendimiento (%) redondeado a 4 decimales
     */
    try {
        const { kilosVaciados, calidad1 = 0, calidad15 = 0, calidad2 = 0 } = data;
        const kilos = Number(kilosVaciados) || 0;
        if (kilos === 0) return 0;

        const totalExportacion = calidad1 + calidad15 + calidad2;
        const rendimiento = (totalExportacion * 100) / kilos;

        return Number(rendimiento.toFixed(4));
    } catch (err) {
        throw new ProcessError(602, `${err.type} ${err.message}`);
    }
}
async function deshidratacionLote(data) {
    /**
     * Calcula y guarda la deshidratación del lote, sumando toda la fruta procesada,
     * descartes, fruta nacional, directo nacional y exportación, para luego
     * obtener el porcentaje de deshidratación basado en los kilos totales ingresados.
     *
     * @param {object} data - Objeto con los elementos del lote.
     * @return {number} - Deshidratación total redondeada a 4 decimales.
     */
    try {
        const {
            kilos: kilosTotal,
            descarteLavado,
            descarteEncerado,
            frutaNacional,
            directoNacional,
            calidad1,
            calidad15,
            calidad2,
        } = data;


        if (kilosTotal === 0) return 0;

        const totalDescarteLavado = descarteLavado ? descarteTotal(descarteLavado) : 0;
        const totalDescarteEncerado = descarteEncerado ? descarteTotal(descarteEncerado) : 0;

        const totalProcesado =
            calidad1 +
            calidad15 +
            calidad2 +
            totalDescarteLavado +
            totalDescarteEncerado +
            frutaNacional +
            directoNacional;



        const deshidratacion = 100 - (totalProcesado * 100) / kilosTotal;
        return Number(deshidratacion.toFixed(4));
    } catch (err) {
        throw new ProcessError(602, `${err.type} ${err.message}`);
    }
}
export function descarteTotal(descarte) {
    /**
     * Funcion que suma los descartes 
     * 
     * @param {descarteObject} descarte - objeto de los descartes, ya sead escarte lavado o descarte encerado
     * @return {numeric} - el total del tipo de descarte
     */
    try {

        const sum = Object.values(descarte).reduce((acu, item) => acu += item, 0);
        return sum;
    } catch (err) {
        throw new ProcessError(416, `Error sumando los descartes ${err.message}`);
    }
}

const checkFinalizadoLote = lote => lote?.finalizado;

function descarte_nopago_pago(lote, tiposDescartes) {
    const descartes = tiposDescartes.map(item => item)
    const frutaNacional = tiposDescartes.find(item => item.nombre === 'frutaNacional')?._id
    if (!frutaNacional) {
        throw new Error("Fruta nacional no encontrada");
    }

    let pago = 0
    let noPago = 0
    let nacional = 0

    for (const [key, value] of Object.entries(lote.descartes)) {
        const descarte = descartes.find(item => item._id === key)
        if (descarte && !descarte.pago) {
            noPago += (value);
        } else if (key === frutaNacional) {
            nacional += (value);
        } else {
            pago += (value);
        }
    }
    let deshidratacion = 0
    if (lote.deshidratacion) {
        deshidratacion = lote.deshidratacion === 0 ? 0 :
            (lote.deshidratacion / 100) * lote.kilos
    }
    if (noPago > 0) {
        noPago += deshidratacion
    } else if (pago > 0) {
        pago += deshidratacion
    }

    return { pago, noPago, nacional }
}



function descarte_nopago_pago_comprado(lote, tiposDescartes) {
    const descartes = tiposDescartes.map(item => item)
    let pagoComprado = 0
    let noPagoComprado = 0
    for (const [key, value] of Object.entries(lote.descartesComprados)) {
        const descarte = descartes.find(item => item._id === key)
        if (descarte && !descarte.pago) {
            noPagoComprado += value;
        } else {
            pagoComprado += value;
        }
    }

    return { pagoComprado, noPagoComprado }
}

export {
    rendimientoLote,
    deshidratacionLote,
    checkFinalizadoLote,
    descarte_nopago_pago,
    descarte_nopago_pago_comprado
};
