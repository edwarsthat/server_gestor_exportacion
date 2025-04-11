
class InventariosValidations {
    static post_inventarios_canastillas_registro(data) {
        const {
            destino,
            origen,
            observaciones,
            fecha,
            canastillas,
            canastillasPrestadas,
            accion,
            remitente,
            destinatario
        } = data
        // Validar que destino, origen, observaciones y accion sean strings no vacíos
        if (typeof destino !== 'string' || destino.trim() === '') {
            throw new Error('El destino debe ser una cadena de texto no vacía.');
        }

        if (typeof origen !== 'string' || origen.trim() === '') {
            throw new Error('El origen debe ser una cadena de texto no vacía.');
        }

        if (observaciones !== undefined && typeof observaciones !== 'string') {
            throw new Error('Las observaciones deben ser una cadena de texto si se incluyen.');
        }

        if (typeof accion !== 'string' || accion.trim() === '') {
            throw new Error('La acción debe ser una cadena de texto no vacía.');
        }

        // Validar que fecha sea un string que se pueda convertir a fecha válida
        if (typeof fecha !== 'string' || fecha.trim() === '') {
            throw new Error('La fecha debe ser una cadena de texto no vacía.');
        } else {
            const fechaConvertida = new Date(fecha);
            if (isNaN(fechaConvertida.getTime())) {
                throw new Error('La fecha no tiene un formato válido.');
            }
        }

        // Validar que canastillas y canastillasPrestadas sean enteros positivos
        if (!Number.isInteger(canastillas) || canastillas < 0) {
            throw new Error('canastillas debe ser un número entero positivo.');
        }

        if (!Number.isInteger(canastillasPrestadas) || canastillasPrestadas < 0) {
            throw new Error('canastillasPrestadas debe ser un número entero positivo.');
        }

        const ACCIONES_VALIDAS = ["ingreso", "salida", "traslado", "retiro", "cancelado"];

        if (!ACCIONES_VALIDAS.includes(accion.toLowerCase().trim())) {
            throw new Error(`La acción '${accion}' no es válida. Usa: ${ACCIONES_VALIDAS.join(", ")}`);
        }

        // Remitente y destinatario (opcionales pero si existen, que tengan contenido útil)
        if (remitente !== undefined && (typeof remitente !== 'string')) {
            throw new Error('El remitente debe ser una cadena de texto no vacía si se proporciona.');
        }

        if (destinatario !== undefined && (typeof destinatario !== 'string')) {
            throw new Error('El destinatario debe ser una cadena de texto no vacía si se proporciona.');
        }


        return true; // Si pasa todas las validaciones
    }
    static validarFiltroBusquedaFechaPaginacion(data) {
        const { filtro, page } = data;
        const { fechaInicio, fechaFin } = filtro

        // Validar que page exista y sea un entero >= 1
        if (!Number.isInteger(page) || page < 1) {
            throw new Error('El número de página debe ser un entero mayor o igual a 1.');
        }

        // Validar que fechaInicio y fechaFin (si existen) sean strings válidos y representen fechas
        if (fechaInicio !== undefined) {
            if (typeof fechaInicio !== 'string' || fechaInicio.trim() === '') {
                throw new Error('fechaInicio debe ser una cadena de texto no vacía si se proporciona.');
            }

            const fechaValida = new Date(fechaInicio);
            if (isNaN(fechaValida.getTime())) {
                throw new Error('fechaInicio no tiene un formato de fecha válido.');
            }
        }

        if (fechaFin !== undefined) {
            if (typeof fechaFin !== 'string' || fechaFin.trim() === '') {
                throw new Error('fechaFin debe ser una cadena de texto no vacía si se proporciona.');
            }

            const fechaValida = new Date(fechaFin);
            if (isNaN(fechaValida.getTime())) {
                throw new Error('fechaFin no tiene un formato de fecha válido.');
            }
        }

        // Validar que fechaInicio no sea posterior a fechaFin (si ambos existen)
        if (fechaInicio && fechaFin) {
            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);

            if (inicio > fin) {
                throw new Error('fechaInicio no puede ser posterior a fechaFin.');
            }
        }

        return true; // Si llega hasta acá, está limpio como el historial de un político recién electo.
    }


}

module.exports.InventariosValidations = InventariosValidations