export const addHours = (date, hours) => {
    const d = new Date(date);
    d.setHours(d.getHours() + hours);
    return d;
};

export function getColombiaDate(date = new Date()) {
    // Asegurarse de que sea un objeto Date válido
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        throw new Error('Fecha inválida proporcionada');
    }

    // Convertir a UTC y restar 5 horas para hora de Colombia
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    return new Date(utc - (5 * 60 * 60 * 1000));
}

export function colombiaToUTC(dateString) {
    // Crea una fecha con la hora local Colombia, pero la interpreta como local del servidor (típicamente UTC)
    const fechaCol = new Date(dateString);

    // Suma 5 horas para convertir a UTC
    fechaCol.setHours(fechaCol.getHours() + 5);

    return fechaCol;
}