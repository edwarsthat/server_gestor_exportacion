export const addHours = (date, hours) => {
    const d = new Date(date);
    d.setHours(d.getHours() + hours);
    return d;
};

export function getColombiaDate(date = new Date()) {
    // Devuelve un objeto Date con la hora local Colombia (UTC-5) basada en la fecha dada
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000); // pasa a UTC
    // Colombia está en UTC-5:00, así que restamos 5 horas
    return new Date(utc - (5 * 60 * 60 * 1000));
}

export function colombiaToUTC(dateString) {
    // Crea una fecha con la hora local Colombia, pero la interpreta como local del servidor (típicamente UTC)
    const fechaCol = new Date(dateString);

    // Suma 5 horas para convertir a UTC
    fechaCol.setHours(fechaCol.getHours() + 5);

    return fechaCol;
}