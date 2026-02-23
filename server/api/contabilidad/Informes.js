import mongoose from "mongoose";
import { ConstantesDelSistema } from "../../Class/ConstantesDelSistema.js";
import { ItemPalletRepository } from "../../Class/Contenedores.js";
import { LoteMaquilaRepository, LotesRepository } from "../../Class/Lotes.js";
import { executeQueryTask } from "../../utils/wrappers.js";
import { descarte_nopago_pago, descarte_nopago_pago_comprado } from "../utils/lotesFunctions.js";
import { decimalToComma } from "../utils/procesamientoTexto.js";

export class InformesContabilidadController {
    static async get_contabilidad_informes_calidad(req) {
        return await executeQueryTask(async () => {

            const page = Math.max(1, parseInt(req.data?.page) || 1);
            const resultsPerPage = 50;
            const query = {
                enf: { $regex: '^E' },
                aprobacionComercial: true,
                aprobacionProduccion: true,
            }
            const lotes = await LotesRepository.get_data({
                query: query,
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
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
                populate: [
                    { path: 'predio', select: 'PREDIO ICA DEPARTAMENTO GGN precio' },
                    { path: 'tipoFruta' },
                ]
            })
            return lotes
        });
    }
    static async get_contabilidad_informeMaquila_resumenInforme(req) {
        return await executeQueryTask(async () => {
            const { loteId } = req.data
            const pipeline = [
                {
                    '$match': {
                        'lote': new mongoose.Types.ObjectId(loteId)
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

            const [loteDocs, itemsPalletDocs, calidadesExportDocs, tiposDescartesDocs] = await Promise.all([
                LoteMaquilaRepository.get_data({
                    ids: [loteId],
                    populate: [
                        { path: 'predio', select: 'PREDIO GGN ICA' },
                        { path: 'tipoFruta', select: 'tipoFruta codNacional' },
                        { path: 'cliente', select: 'CLIENTE' },
                        { path: "user", select: "usuario nombre apellido" },
                        { path: 'salidaExportacion.contenedores', select: 'numeroContenedor infoContenedor.maquila' },
                        { path: 'precio', select: 'exportacion frutaNacional descarte' },

                    ],
                    lean: true
                }),
                ItemPalletRepository.aggregateAndPopulate(pipeline, populateOptions),
                ConstantesDelSistema.get_constantes_sistema_calidades(),
                ConstantesDelSistema.get_constantes_sistema_descartes()
            ])
            if (loteDocs.length === 0) throw new Error("No se encontro el lote")
            if (itemsPalletDocs.length === 0) throw new Error("No se encontraron items en el pallet")
            if (calidadesExportDocs.length === 0) throw new Error("No se encontraron configuraciones de calidades")
            if (tiposDescartesDocs.length === 0) throw new Error("No se encontraron configuraciones de descartes")



            const [lote, itemsPallet, calidadesExport, tiposDescartes] = [loteDocs[0], itemsPalletDocs, calidadesExportDocs, tiposDescartesDocs]
            const contenedores = lote.salidaExportacion?.contenedores || []
            const porCalidad = lote.salidaExportacion?.porCalidad || {}
            let out = ""

            const frutaNacional = tiposDescartes.find(item => item.nombre === 'frutaNacional')?._id
            if (!frutaNacional) {
                throw new Error("Fruta nacional no encontrada");
            }

            const itemsMap = new Map();
            itemsPallet.forEach(i => {
                const key = `${i.contenedor._id}-${i.calidad._id}`;
                itemsMap.set(key, i.totalKilos);
            });

            if (lote.salidaExportacion) {
                for (const cont of contenedores) {
                    for (const key of Object.keys(porCalidad)) {
                        const mapKey = `${cont._id}-${key}`;
                        const valueCalidad = itemsMap.get(mapKey) || 0;
                        const kilos = decimalToComma(valueCalidad);
                        const cod = calidadesExport.find(c => String(c._id) === String(key))?.codContabilidad || 'N/A';
                        if (valueCalidad === 0) continue;
                        out += `10\t${cod}\tKg\t${kilos}\t\t\t\t\t\t\t\t\t\t${cont?.infoContenedor?.maquila ? "PCONT" + cont.numeroContenedor : ""}\n`
                    }
                }
            }

            const { pago: pagoDevuelto, noPago: noPagoDevuelto } = descarte_nopago_pago(lote, tiposDescartes)

            out += `10\tMPL1\tKilos\t${decimalToComma(noPagoDevuelto)}\t\t\t\n`;
            out += `10\t${lote.tipoFruta.codNacional}\tKilos\t${decimalToComma(pagoDevuelto)}\t\t\t\t\t\t\t\t\tDEVUELTOS A PROVEEDOR\n`;


            const { pagoComprado, noPagoComprado } = descarte_nopago_pago_comprado(lote, tiposDescartes)

            out += `10\tMPL1\tKilos\t${decimalToComma(noPagoComprado)}\t\t\t\n`;
            out += `10\t${lote.tipoFruta.codNacional}\tKilos\t${decimalToComma(pagoComprado)}\t\t\t\n`;

            const directoNacional = lote.directoNacional

            if (directoNacional) {
                out +=
                    `10\t${lote.tipoFruta.codNacional}\tKilos\t${decimalToComma(directoNacional)}\t\t\t\n`;
            }

            if (lote.salidaExportacion) {
                for (const cont of contenedores) {
                    if (cont?.infoContenedor?.maquila) continue;
                    for (const key of Object.keys(porCalidad)) {
                        const mapKey = `${cont._id}-${key}`;
                        const valueCalidad = itemsMap.get(mapKey) || 0;
                        const kilos = decimalToComma(valueCalidad);
                        const cod = calidadesExport.find(c => String(c._id) === String(key))?.codContabilidad || 'N/A';
                        const precioBase = lote?.precio?.exportacion?.[key] || 0;
                        const precioKey = decimalToComma(precioBase);
                        const subTotal = decimalToComma(
                            precioBase * (valueCalidad)
                        );
                        if (valueCalidad === 0) continue;
                        out += `2\t${cod}\tKg\t${kilos}\t${precioKey}\t\t${subTotal}\t\t\t\t\t\t\tPCONT${cont.numeroContenedor}\n`

                    }
                }
            }

            out += `1\tMPL1\tKilos\t${decimalToComma(noPagoComprado)}\t${decimalToComma(0)}\t\t${decimalToComma(0)}\t\t\t\t\t\tNo se paga debido (balin, descompuesta)\n`;

            out += `1\t${lote.tipoFruta.codNacional}\tKilos\t${decimalToComma(pagoComprado)}\t${decimalToComma((lote?.precio?.descarte || 0))}\t\t${decimalToComma(pagoComprado * (lote?.precio?.descarte || 0))}\n`;

            return out
        });
    }
}