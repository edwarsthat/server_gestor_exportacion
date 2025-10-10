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
    const peso = Number(item.tipoCaja.split("-")[1]);
    if (peso >= 18) return "40LB";
    if (peso >= 17) return "37LB";
    if (peso >= 15) return "35LB";
    if (peso >= 13) return "30LB";
    if (peso > 4 && peso < 5) return ("4,5Kg");
}