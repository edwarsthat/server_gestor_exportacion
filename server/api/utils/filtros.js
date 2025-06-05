import { UtilError } from "../../../Error/ProcessError";
import { getISOWeek } from 'date-fns';

function filtroFechaInicioFin(fechaInicio, fechaFin, filter = {}, fecha) {

    if (typeof filter !== 'object' || filter === null)
        throw new UtilError(601, "filtroFechaInicioFin: filtro debe ser un objeto")

    if (fechaInicio || fechaFin) {
        filter[fecha] = {}
        if (fechaInicio) {
            const fechaInicioUTC = new Date(fechaInicio);
            if (isNaN(fechaInicioUTC.getTime()))
                throw new UtilError(601, "filtroFechaInicioFin: Fecha inicio no valida")

            fechaInicioUTC.setHours(fechaInicioUTC.getHours() + 5);
            filter[fecha].$gte = fechaInicioUTC;
        } else {
            filter[fecha].$gte = new Date(0);
        }
        if (fechaFin) {
            const fechaFinUTC = new Date(fechaFin)
            if (isNaN(fechaFinUTC.getTime()))
                throw new UtilError(601, "filtroFechaInicioFin: Fecha fin no valida")

            fechaFinUTC.setDate(fechaFinUTC.getDate() + 1);
            fechaFinUTC.setHours(fechaFinUTC.getHours() + 5);
            filter[fecha].$lt = fechaFinUTC;
        } else {
            filter[fecha].$lt = new Date();
        }
    }

    return filter;

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
    filtroPorSemana
};
