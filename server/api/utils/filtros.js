import { UtilError } from "../../../Error/ProcessError.js";
import { getISOWeek } from 'date-fns';

function filtroFechaInicioFin(fechaInicio, fechaFin, filter = {}, fecha) {

    if (typeof filter !== 'object' || filter === null)
        throw new UtilError(601, "filtroFechaInicioFin: filtro debe ser un objeto")

    if (fechaInicio || fechaFin) {
        Reflect.set(filter, fecha, {});
        const fechaObj = Reflect.get(filter, fecha);

        if (fechaInicio) {
            const fechaInicioUTC = new Date(fechaInicio);
            if (isNaN(fechaInicioUTC.getTime()))
                throw new UtilError(601, "filtroFechaInicioFin: Fecha inicio no valida")

            fechaInicioUTC.setHours(fechaInicioUTC.getHours() + 5);
            fechaObj.$gte = fechaInicioUTC;
        } else {
            fechaObj.$gte = new Date(0);
        }
        if (fechaFin) {
            const fechaFinUTC = new Date(fechaFin)
            if (isNaN(fechaFinUTC.getTime()))
                throw new UtilError(601, "filtroFechaInicioFin: Fecha fin no valida")

            fechaFinUTC.setDate(fechaFinUTC.getDate() + 1);
            fechaFinUTC.setHours(fechaFinUTC.getHours() + 5);
            fechaObj.$lt = fechaFinUTC;
        } else {
            fechaObj.$lt = new Date();
        }
    }

    return filter;

}

function buildDateRangeFilter(start, end, field, baseFilter = {}) {
    console.log("start", start)
    console.log("end", end)
    // Validaciones iniciales
    if (!field) throw new UtilError(601, "buildDateRangeFilter: Debe especificar el nombre del campo de fecha");

    // Clonamos el filtro para no mutar el original (Inmutabilidad)
    const query = { ...baseFilter };

    if (start || end) {
        const dateRange = Object.create(null);

        if (start) {
            const startDate = new Date(start);
            if (isNaN(startDate)) throw new UtilError(601, "Fecha inicio no válida");

            // Inicio del día en hora Colombia (UTC-5) → 00:00 Colombia = 05:00 UTC
            startDate.setUTCHours(5, 0, 0, 0);
            Reflect.set(dateRange, '$gte', startDate);
        }

        if (end) {
            const endDate = new Date(end);
            if (isNaN(endDate)) throw new UtilError(601, "Fecha fin no válida");

            // Fin del día en hora Colombia (23:59:59 UTC-5 = 04:59:59 UTC del día siguiente)
            endDate.setUTCHours(28, 59, 59, 999);
            Reflect.set(dateRange, '$lte', endDate);
        }

        Reflect.set(query, field, dateRange);
    }
    console.log(query)
    return query;
}

function filtroPorSemana(fechaInicio, fechaFin, filter = {}, year = 'year', week = 'week') {
    if (typeof filter !== 'object' || filter === null)
        throw new UtilError(601, "filtroPorSemana: filtro debe ser un objeto")


    if (fechaInicio || fechaFin) {

        let yearInit
        let yearFinish
        let weekInit
        let weekFinish


        if (fechaInicio) {
            const fechaInicioUTC = new Date(fechaInicio);
            fechaInicioUTC.setHours(fechaInicioUTC.getHours() + 5); // Sumar 5 horas
            if (isNaN(fechaInicioUTC.getTime()))
                throw new UtilError(601, "filtroPorSemana: Fecha inicio no valida");

            yearInit = fechaInicioUTC.getFullYear();
            weekInit = getISOWeek(fechaInicioUTC);
        } else {
            const defaultDate = new Date(0);
            defaultDate.setHours(defaultDate.getHours() + 5); // Ajuste de 5 horas
            yearInit = defaultDate.getFullYear();
            weekInit = getISOWeek(defaultDate);
        }

        if (fechaFin) {
            const fechaFinUTC = new Date(fechaFin);
            fechaFinUTC.setHours(fechaFinUTC.getHours() + 5); // Sumar 5 horas
            if (isNaN(fechaFinUTC.getTime()))
                throw new UtilError(601, "filtroPorSemana: Fecha fin no valida");

            yearFinish = fechaFinUTC.getFullYear();
            weekFinish = getISOWeek(fechaFinUTC);
        } else {
            const defaultDate = new Date();
            defaultDate.setHours(defaultDate.getHours() + 5); // Ajuste de 5 horas
            yearFinish = defaultDate.getFullYear();
            weekFinish = getISOWeek(defaultDate);
        }

        filter.$and = [
            { $and: [{ [year]: yearInit }, { [week]: { $gte: weekInit } }] },
            { [year]: { $gte: yearInit, $lte: yearFinish } },
            { $and: [{ [year]: yearFinish }, { [week]: { $lte: weekFinish } }] }
        ]

    }

    return filter;

}

export {
    filtroFechaInicioFin,
    filtroPorSemana,
    buildDateRangeFilter
};
