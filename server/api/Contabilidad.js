// const { LotesRepository } = require("../Class/Lotes");
import { ContabilidadLogicError } from "../../Error/logicLayerError.js";
import { ContenedoresRepository } from "../Class/Contenedores.js";
import { LotesRepository } from "../Class/Lotes.js";
import { OtrosFletesRepository } from "../Class/OtrosFletes.js";
import mongoose from 'mongoose';
//jp
import { db } from "../../DB/mongoDB/config/init.js";
import { response } from "express";
// import { nan } from "zod";

export class ContabilidadRepository {
    static async get_contabilidad_informes_calidad(req) {
        try {
            const { page } = req.data;
            const resultsPerPage = 50;
            const query = {
                enf: { $regex: '^E', $options: 'i' },
                aprobacionComercial: true,
                aprobacionProduccion: true,
            }
            const lotes = await LotesRepository.getLotes({
                query: query,
                skip: (page - 1) * resultsPerPage,
                select: {
                    enf: 1,
                    calidad: 1,
                    tipoFruta: 1,
                    deshidratacion: 1,
                    kilos: 1,
                    canastillas: 1,
                    fecha_ingreso_inventario: 1,
                    fecha_creacion: 1,
                    aprobacionComercial: 1,
                    aprobacionProduccion: 1,
                    fecha_finalizado_proceso: 1,
                    fecha_aprobacion_comercial: 1,

                },
                limit: resultsPerPage,
                populate: [
                    { path: 'predio', select: 'PREDIO ICA DEPARTAMENTO GGN precio' },
                    { path: 'tipoFruta' },
                ]
            })
            return lotes
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new ContabilidadLogicError(475, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_contabilidad_informes_calidad_numeroElementos() {
        try {
            const query = {
                enf: { $regex: '^E', $options: 'i' },
                aprobacionComercial: true,
                aprobacionProduccion: true,
            }
            const response = await LotesRepository.get_numero_lotes(query)
            return response;
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new ContabilidadLogicError(475, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_contabilidad_informe_lote_detalle(req) {
        try {
            const { _id } = req.data

            const [lote, itemsExp] = await Promise.all([
                LotesRepository.getLotes({
                    ids: [_id],
                    populate: [
                        { path: 'predio', select: 'PREDIO GGN ICA' },
                        { path: 'tipoFruta', select: 'tipoFruta codNacional' },
                        { path: "user", select: "usuario nombre apellido" },
                        { path: 'salidaExportacion.contenedores', select: 'numeroContenedor' },
                        { path: 'precio', select: 'exportacion frutaNacional descarte' },

                    ]
                }),
                ContenedoresRepository.getItemsPallets({
                    query: { lote: _id },
                    populate: [
                        { path: 'calidad', select: 'nombre descripcion' },
                        { path: 'contenedor', select: 'numeroContenedor infoContenedor.maquila' }
                    ]
                })
            ])

            if (!lote || lote.length === 0) {
                throw new ContabilidadLogicError(404, "Lote no encontrado.");
            }

            return { lote: lote[0], itemsPallets: itemsExp }
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new ContabilidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_contabilidad_informesMaquila_calidad(req) {
        try {
            const { page } = req.data
            const resultsPerPage = 50;

            const lotes = await LotesRepository.getLotesMaquila({
                query: {
                    aprobacionComercial: true,
                    aprobacionProduccion: true,
                },
                skip: (page - 1) * resultsPerPage,
                select: {
                    enf: 1,
                    calidad: 1,
                    tipoFruta: 1,
                    deshidratacion: 1,
                    kilos: 1,
                    canastillas: 1,
                    fecha_ingreso_inventario: 1,
                    fecha_creacion: 1,
                    aprobacionComercial: 1,
                    aprobacionProduccion: 1,
                    fecha_finalizado_proceso: 1,
                    fecha_aprobacion_comercial: 1,
                },
                limit: resultsPerPage,
                populate: [
                    { path: 'predio', select: 'PREDIO ICA DEPARTAMENTO GGN precio' },
                    { path: 'precio', select: 'exportacion frutaNacional descarte' },
                    { path: 'salidaExportacion.contenedores', select: 'numeroContenedor' },
                    { path: 'tipoFruta' },
                ]

            })
            return lotes
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ContabilidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_contabilidad_informesMaquila_calidad_numeroElementos(req) {
        try {
            const { filtro = {} } = req.data
            const numeroContenedores = await LotesRepository.get_numero_lotes_maquila(filtro)
            return numeroContenedores

        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new ContabilidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_contabilidad_informeMaquila_loteMaquila_detalle(req) {
        try {
            const { _id } = req.data

            const pipeline = [
                {
                    '$match': {
                        'lote': new mongoose.Types.ObjectId(_id)
                    }
                }, {
                    '$group': {
                        '_id': {
                            'contenedor': '$contenedor',
                            'calidad': '$calidad'
                        },
                        'totalKilos': {
                            '$sum': '$kilos'
                        },
                        'count': {
                            '$sum': 1
                        }
                    }
                }, {
                    '$project': {
                        '_id': 0,
                        'contenedor': '$_id.contenedor',
                        'calidad': '$_id.calidad',
                        'totalKilos': 1,
                        'documentosAgrupados': '$count'
                    }
                }
            ];

            const populateOptions = [
                { path: 'calidad', select: 'nombre descripcion' },
                { path: 'contenedor', select: 'numeroContenedor infoContenedor.maquila' }
            ];


            const [lote, itemsExp] = await Promise.all([
                LotesRepository.getLotesMaquila({
                    ids: [_id],
                    populate: [
                        { path: 'predio', select: 'PREDIO GGN ICA' },
                        { path: 'tipoFruta', select: 'tipoFruta' },
                        { path: 'cliente', select: 'CLIENTE' },
                        { path: "user", select: "usuario nombre apellido" },
                        { path: 'salidaExportacion.contenedores', select: 'numeroContenedor' },
                        { path: 'precio', select: 'exportacion frutaNacional descarte' },

                    ]
                }),
                ContenedoresRepository.aggregateAndPopulate(pipeline, populateOptions)
            ])

            if (!lote || lote.length === 0) {
                throw new ContabilidadLogicError(404, "Lote no encontrado.");
            }

            return { lote: lote[0], itemsPallets: itemsExp }
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new ContabilidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }

    // Obtener informe de fletes
    static async get_contabilidad_informe_fletes(req) {
        try {
            const { page = 1 } = req.data || {};
            const resultsPerPage = 50;

            // EF = Ingreso físico de fruta (fuente oficial para informe de fletes)
            const lotes = await LotesRepository.getLotes({
                query: { enf: { $regex: '^EF', $options: 'i' } },
                skip: (page - 1) * resultsPerPage,
                limit: 0, // se cambia esto para que traiga todos los efn resultsPerPage por 0 (sin limite)
                sort: { fecha_ingreso_inventario: -1 },
                select: {
                    enf: 1,
                    predio: 1,
                    canastillas: 1,
                    kilos: 1,
                    fecha_ingreso_inventario: 1,
                    placa: 1,
                    // conductor: 1
                    esFleteCompuesto: 1,
                    grupoFlete: 1,
                    totalFlete: 1,
                    tarifaCongelada: 1, //nueva tarifa solo para ese viaje 
                    observacionesTF: 1, //para verlo en la tabla del front. Jp
                    fleteCompuestoId: 1 //para crear el felteagrupado
                },
                populate: [
                    { path: "predio", select: "PREDIO GGN tarifaFleteKg flete" },
                    { path: "fleteCompuestoId", strictPopulate: false } //para traer los datos del grupo.Jp
                ]
            });

            // Normalizamos los datos para la vista FLETES
            const fletes = await Promise.all (lotes.map(async lote => {
                // const fletes = lotes.map(lote => {

                const canastillas = Number(lote.canastillas) || 0;
                const kilosFruta = Number(lote.kilos) || 0;

                //📅 Año según la fecha real del lote
                const fechaLote = lote.fecha_ingreso_inventario
                    ? new Date(lote.fecha_ingreso_inventario)
                    : null;

                const yearTarifa = fechaLote ? fechaLote.getFullYear() : null;

                // 💰 Buscar tarifa por predio + año
                const tarifaPredio = yearTarifa
                    ? await db.TarifaPredio.findOne({
                        predio: lote.predio?._id,
                        year: yearTarifa,
                        tipo: "FIJA",
                        activo: true
                    }).lean()
                    : null;

                const totalKilosTransportados = (canastillas * 2.2) + kilosFruta;

                // Tarifa por Kg (sale del predio), 
                // se ajusta la lógica por que se guarda en flete y se utiliza tarifaFleteKg .Jp
                const tarifaBase = Number(
                    tarifaPredio?.valor ??          // ← NUEVO: busca primero en historial
                    lote.predio?.tarifaFleteKg ??   // fallback al campo del proveedor
                    lote.predio?.flete ??           //otro fallback
                    NaN
                );

                const tarifaKg = Number( lote.tarifaCongelada ?? tarifaBase );

                // Kilos facturables (mínimo 5000Kg), si es mayor se factura peso actual X tarifa lote.Jp
                const kilosFacturables = Math.max(totalKilosTransportados, 5000);

                const fleteData = lote.fleteCompuestoId //nuevo.Jp

                // const totalFlete = lote.esFleteCompuesto
                //     ? lote.totalFlete : (tarifaKg ? kilosFacturables * tarifaKg : NaN);
                const esAgrupado = lote.esFleteCompuesto  === true
                    && fleteData != null
                    && typeof fleteData.totalFlete === 'number';

                // Buscar la parte proporcional de este lote en la distribución guardada
                const distribucionLote = esAgrupado
                    ? fleteData.distribucion?.find(
                        d => d.loteId.toString() === lote._id.toString()
                    )
                    : null;
                
                const totalFlete = esAgrupado
                    ? (distribucionLote?.totalFlete ?? fleteData.totalFlete)
                    : (typeof tarifaKg === 'number' && !isNaN(tarifaKg)
                        ? kilosFacturables * tarifaKg
                        : 0);

                // Cálculo de semana
                const fecha = lote.fecha_ingreso_inventario
                    ? new Date(lote.fecha_ingreso_inventario)
                    : null;

                const semana = fecha
                    ? Math.ceil(
                        (((fecha - new Date(fecha.getFullYear(), 0, 1)) / 86400000) +
                            new Date(fecha.getFullYear(), 0, 1).getDay() + 1) / 7
                    )
                    : null;

                return {
                    _id: lote._id,
                    fechaIngreso: lote.fecha_ingreso_inventario,
                    ef1: lote.enf,
                    predio: lote.predio?.PREDIO ?? 'N/A',
                    canastillas,
                    kgFruta: kilosFruta,
                    totalKilosTransportados,
                    tarifaKg: isNaN(tarifaKg) ?'SIN TARIFA' : tarifaKg,
                    totalFlete,
                    tarifaEsCongelada: Boolean(lote.tarifaCongelada),
                    observacionesTF: lote.observacionesTF ?? '', //lo que pasa el objeto final. Jp
                    placa: lote.placa ?? 'N/A',
                    // conductor: lote.conductor ?? 'N/A',
                    semana,
                    esFleteCompuesto: esAgrupado,   // ← usa la variable calculada, no lote.esFleteCompuesto directamente
                    grupoFlete: esAgrupado ? (lote.grupoFlete ?? null) : null,
                    fleteCompuestoId: esAgrupado ? (fleteData?._id ?? null) : null
                };
            })
        );

            return fletes;

        } catch (err) {
            if (err.status === 524) throw err;
            throw new ContabilidadLogicError(475,`Error ${err.type || ""}: ${err.message}`);
        }
    }

//se reemplaza la logica .JP
static async agrupar_fletes_compuestos(req) {
    try {
        const ingresoIds = req?.data?.data?.ingresoIds;
        
        console.log("🚀 [DEBUG] IDs recibidos del front:", ingresoIds);

        if (!ingresoIds || ingresoIds.length < 2) {
            throw new ContabilidadLogicError(400, "Debe seleccionar mínimo dos ingresos para agrupar");
        }

        // 1️⃣ Obtener lotes BASE
        const lotes = await LotesRepository.getLotes({
            ids: ingresoIds,
            populate: [
                { path: "predio", select: "PREDIO" } //Solo traemos el nombre, la tarifa la buscamos aparte
            ]
        });

        if (!lotes || lotes.length < 2) {
            throw new ContabilidadLogicError(404, "Ingresos no encontrados");
        }

        //(Paso 2): Buscar tarifas oficiales en la colección TarifaPredio por año
        const detalleConTarifas = await Promise.all(lotes.map(async (lote) => {
        const fechaLote = lote.fecha_ingreso_inventario ? new Date(lote.fecha_ingreso_inventario) : null;
        const yearTarifa = fechaLote ? fechaLote.getFullYear() : null;

        const tarifaHistorica = yearTarifa 
            ? await db.TarifaPredio.findOne({
                predio: lote.predio?._id,
                year: yearTarifa,
                tipo: "FIJA",
                activo: true
                }).lean()
            : null;

        // Prioridad: Congelada > Histórica > Fallback de seguridad
        const tarifaFinal = Number(
            lote.tarifaCongelada ?? 
            tarifaHistorica?.valor ?? 
            lote.predio?.tarifaFleteKg ?? 
            lote.predio?.flete ?? 
            NaN
        );

        //se usa el spread directo
        return { ...lote, tarifaCalculada: tarifaFinal };
        }));

        // 2️⃣ Validar misma placa (usamos detalleConTarifas ahora)
        const placaBase = detalleConTarifas[0].placa;
        const mismaPlaca = detalleConTarifas.every(l => l.placa === placaBase);

        if (!mismaPlaca) {
            throw new ContabilidadLogicError(400, "Todos los ingresos deben pertenecer al mismo vehículo (placa)");
        }

        // 3️⃣ Total kilos reales
        const kilosTotales = detalleConTarifas.reduce((acc, l) => {
            const can = Number(l.canastillas) || 0;
            const kg = Number(l.kilos) || 0;
            return acc + (can * 2.2) + kg;
        }, 0);

        // 4️⃣ (Paso 3): Extraer tarifas del nuevo mapeo
        const tarifas = detalleConTarifas
            .map(l => l.tarifaCalculada)
            .filter(t => !isNaN(t));

        console.log("💰 [DEBUG] Tarifas reales extraídas:", tarifas);

        if (tarifas.length !== detalleConTarifas.length) {
            throw new ContabilidadLogicError(400, "Todos los ingresos deben tener tarifa de flete configurada");
        }

        // 5️⃣ Regla mínimo 5000
        const kilosFacturables = Math.max(kilosTotales, 5000);

        // 6️⃣ Tarifa menor 
        const tarifaMenor = Math.min(...tarifas);

        // 7️⃣ Recargo (50k por predio adicional)
        const recargo = (detalleConTarifas.length - 1) * 50000;

        // 8️⃣ Total flete compuesto
        const totalFleteCompuesto = (tarifaMenor * kilosFacturables) + recargo;

        //AQUÍ EMPIEZA LO NUEVO (PERSISTENCIA).Jp
        // Calcular distribución proporcional
        const distribucion = detalleConTarifas.map(lote => {
            const kilosLote = (Number(lote.canastillas) || 0) * 2.2 + (Number(lote.kilos) || 0);
            const proporcion = kilosTotales > 0 ? kilosLote / kilosTotales : 0;
                return {
                    loteId: lote._id,
                    kilos: kilosLote,
                    proporcion,
                    totalFlete: Math.round(totalFleteCompuesto * proporcion)
                    };
                });
        // A. Crear el registro en la nueva colección
        const codigoGrupo = `FC-${placaBase.replace(/\s/g, '')}-${Date.now().toString().slice(-4)}`;
        
        const nuevoFleteDB = await db.FleteCompuesto.create({
            codigoGrupo,
            placa: placaBase,
            lotes: ingresoIds,
            distribucion,
            tarifaAplicada: tarifaMenor,
            kilosTotales,
            kilosFacturables,
            recargoPredios: recargo,
            totalFlete: totalFleteCompuesto,
            usuario: req.user?._id
        });
        
        // B. Marcar los lotes para que "sepan" que ya están agrupados
        await db.Lotes.updateMany(
            { _id: { $in: ingresoIds } },
            { 
                $set: { 
                    fleteCompuestoId: nuevoFleteDB._id,
                    esFleteCompuesto: true,
                },
                $unset: { totalFlete: "", grupoFlete: "" }
            }
        );

        // 9️⃣ (Paso 4): Distribución proporcional usando detalleConTarifas
        const detalle = detalleConTarifas.map(lote => {
            const kilosLote = (Number(lote.canastillas) || 0) * 2.2 + (Number(lote.kilos) || 0);
            const proporcion = kilosTotales > 0 ? kilosLote / kilosTotales : 0;

            return {
                ...lote,
                esFleteCompuesto: true,
                fleteCompuestoId: nuevoFleteDB._id, // Importante para poder borrarlo luego
                vistaFlete: "COMPUESTO",
                tarifaKg: tarifaMenor,
                totalKilosTransportados: kilosLote,
                totalFlete: Math.round(totalFleteCompuesto * proporcion),
                grupoFlete: placaBase
            };
        });

        // 🔟 RESPUESTA
        return {
            vista: "agrupada",
            fleteId: nuevoFleteDB._id,
            resumen: {
                tipo: "FLETE_COMPUESTO",
                codigoGrupo,
                placa: placaBase,
                numeroPredios: detalleConTarifas.length,
                tarifaMenor,
                kilosReales: kilosTotales,
                kilosFacturables,
                recargo,
                totalFlete: totalFleteCompuesto
            },
            detalle
        };
        } catch (err) {
            console.error("🔥 [ERROR] Falló agrupar_fletes_compuestos:", err.message);
            if (err instanceof ContabilidadLogicError) throw err;
            console.log("🔍 Estado de db.FleteCompuesto:", db.FleteCompuesto);
            throw new ContabilidadLogicError(475, `Error agrupando flete compuesto: ${err.message}`);
        }
    }

    static async delete_flete_compuesto(req) {
        try {
            console.log("📦 req.data completo:", JSON.stringify(req.data))  
            const { fleteId } = req.data.data;

            if (!fleteId) throw new ContabilidadLogicError(400, "ID de flete compuesto requerido");

            // 1. Buscar el flete antes de borrarlo para saber qué lotes soltar
            const flete = await db.FleteCompuesto.findById(fleteId);
            if (!flete) throw new ContabilidadLogicError(404, "El flete no existe");

            // 2. Liberar los lotes (quitarles la marca de agrupamiento)
            await db.Lotes.updateMany(
                { _id: { $in: flete.lotes } },
                { 
                    $set: {  
                        esFleteCompuesto: false 
                    },
                    $unset: {
                        fleteCompuestoId: "",
                        totalFlete: "", 
                        grupoFlete: "" 
                }
                }
            );

            // 3. Eliminar físicamente el registro del flete compuesto
            await db.FleteCompuesto.findByIdAndDelete(fleteId);

            return { status: 200, message: "Flete desagrupado correctamente. Los lotes ahora son individuales." };

        } catch (err) {
            console.error("🔥 [ERROR] delete_flete_compuesto:", err.message);
            throw new ContabilidadLogicError(475, `No se pudo eliminar: ${err.message}`);
        }
    }

    static async put_tarifa_congelada(req) {
        try {
            // Recibimos también 'observaciones' desde el frontend. Jp
            const { loteId, nuevaTarifa, observacionesTF } = req.data;
            
            const tarifaNumerica = Number(nuevaTarifa);
            if (isNaN(tarifaNumerica)) {
                throw new Error("Tarifa inválida");
            }

            // Preparamos el objeto de actualización. Jp
            const updateData = { 
                tarifaCongelada: tarifaNumerica
            };

            //si vienen observaciones, las incluimos para que se guarden en EF especificas. Jp
            if (observacionesTF !== undefined) {
                updateData.observacionesTF = observacionesTF;
            }

            await LotesRepository.actualizar_lote(
                {_id: loteId},
                // { $set: { tarifaCongelada: tarifaNumerica } },
                { $set: updateData },
                { calculateFields: false,
                    action: "put_comercial_registroPrecios_proveedores_comentario", // Usamos una acción excluida para no resetear aprobaciones
                }
                //  }
            );

            return { 
                status: 200,
                message: "Tarifa y observaciones congelada guardada correctamente en el EF",
                data: response // Devolvemos la respuesta del repo para ver qué hizo
            };

        } catch (err) {
            console.error("Error en put_tarifa_congelada:", err.message);
            throw new Error(err.message);
        }
    }
    //Otros fletes
    static async post_contabilidad_otros_fletes(req) {
    try {
        console.log("REQ.DATA:", req.data);
        console.log("REQ.USER:", req.user?._id);

        const { fecha, destino, tipoFlete, valorFlete, placa, conductor, observaciones, semana } = req.data.data;

        const nuevoRegistro = await db.OtrosFletes.create({
            fecha: new Date(fecha),
            destino,
            tipoFlete,
            valorFlete: Number(valorFlete),
            placa,
            conductor,
            observaciones: observaciones || "",
            semana,
            usuario: req.user?._id
        });

        return nuevoRegistro;

    } catch (err) {
        throw new ContabilidadLogicError(500, err.message);
    }
}
    static async get_contabilidad_otros_fletes(req) {
    try {

        const filtros = req.data || {};

        const data = await OtrosFletesRepository.getOtrosFletes(filtros);

        return data;

    } catch (err) {
        throw new ContabilidadLogicError(
            475,
            `Error obteniendo otros fletes: ${err.message}`
        );
    }
}
}
