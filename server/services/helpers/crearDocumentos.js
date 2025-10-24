import { parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

export const styleNormalCell = {
    top: { style: 'medium' },
    left: { style: 'medium' },
    bottom: { style: 'medium' },
    right: { style: 'medium' }
};
export const setCellProperties = (cell, value, font = 14, bold = false) => {
    cell.value = value
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.font = { size: font, bold: bold }
    cell.border = styleNormalCell

};
export const formatearFecha = (fechaString, hora = false) => {
    if (!fechaString) {
        return '';
    }

    const zonaHoraria = 'America/Bogota';

    // Analizar la fecha UTC
    const fechaUTC = parseISO(fechaString);

    // Convertir a la zona horaria de Bogotá
    const fechaBogota = toZonedTime(fechaUTC, zonaHoraria);

    // Formatear la fecha
    if (hora) {
        return format(fechaBogota, 'dd/MM/yyyy HH:mm:ss', { locale: es });
    }

    return format(fechaBogota, 'dd/MM/yyyy', { locale: es });
};
export const labelListaEmpaque = {
    Limon: "TAHITI",
    Naranja: "ORANGE"
}
export const mostrarKilose = (item) => {
    // Validar que item.tipoCaja existe y es un string
    if (!item.tipoCaja || typeof item.tipoCaja !== 'string') {
        console.error('tipoCaja no válido:', item.tipoCaja);
        return "N/A"; // O un valor por defecto
    }

    const partes = item.tipoCaja.split("-");
    if (partes.length < 2) {
        console.error('Formato de tipoCaja inválido:', item.tipoCaja);
        return "N/A";
    }

    const peso = Number(partes[1]);

    if (isNaN(peso)) {
        console.error('Peso no es un número válido:', partes[1]);
        return "N/A";
    }

    if (peso >= 18) return "40LB";
    if (peso >= 17) return "37LB";
    if (peso >= 15) return "35LB";
    if (peso >= 13) return "30LB";
    if (peso > 4 && peso < 5) return "4,5Kg";

    return "N/A"; // Valor por defecto si no coincide ninguna condición
}
export function numeroALetras(num) {
    const unidades = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const decenas2 = ['veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
    const decenas3 = ['treinta', 'treinta y uno'];

    if (num < 10) return unidades[num];
    if (num < 20) return decenas[num - 10];
    if (num < 30) return decenas2[num - 20];
    if (num <= 31) return decenas3[num - 30];
    return 'Número fuera de rango';
}
export const setCellPropertiesDatalogger = (cell, value, font = 14, bold = false) => {
    cell.value = value
    cell.alignment = { horizontal: 'start', vertical: 'middle', wrapText: true }
    cell.font = { size: font, bold: bold }
    cell.border = styleNormalCell
};