import { ContenedoresRepository, ItemPalletRepository } from "../../Class/Contenedores.js";
import { CrearDocumentosRepository } from "../../services/crearDocumentos.js";
import { executeQueryTask } from "../../utils/wrappers.js";

export class ListaEmpaqueController {
    static async get_inventarios_historiales_listaDeEmpaque_crearDocumento(req) {
        return await executeQueryTask(async () => {
            const { contenedor, tipo } = req.data
            const contenedorData = await ContenedoresRepository.get_data({
                query: { _id: contenedor },
                select: { infoContenedor: 1, __v: 1, numeroContenedor: 1, infoTractoMula: 1 },
                populate: [
                    {
                        path: 'infoContenedor.clienteInfo',
                        select: 'CLIENTE PAIS_DESTINO',
                    },
                    {
                        path: 'infoContenedor.tipoFruta',
                        select: 'tipoFruta exportName',
                    },
                    {
                        path: 'infoContenedor.calidad',
                        select: 'nombre descripcion',
                    },
                    {
                        path: 'registrosSalidas',
                        select: 'datalogger_id',
                    },

                ]
            });
            const itemsPallet = await ItemPalletRepository.get_data({
                query: { contenedor: contenedor },
                populate:
                    [
                        { path: 'calidad', select: 'nombre descripcion' },
                        { path: 'pallet', select: 'numeroPallet' },
                        { path: 'contenedor', select: 'numeroContenedor' },
                        { path: 'tipoFruta', select: 'tipoFruta ' },
                        {
                            path: 'lote',
                            select: 'enf predio finalizado GGN',
                            populate: {
                                path: 'predio',
                                select: 'PREDIO GGN ICA',
                            }
                        }
                    ],
                sort: { 'pallet.numeroPallet': 1 }
            })

            // console.log(itemsPallet)
            const sortItemsPallet = itemsPallet.sort((a, b) => {
                return a.pallet.numeroPallet - b.pallet.numeroPallet;
            });
            let buffer
            if (tipo === "listaEmpaque") {
                buffer = await CrearDocumentosRepository.crear_listas_de_empaque(contenedorData[0], sortItemsPallet)
                const base64 = buffer.toString('base64');

                return {
                    file: base64,
                    filename: `lista_empaque_${contenedorData[0].numeroContenedor}_${Date.now()}.xlsx`,
                    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            } else if (tipo === "reportePredios") {
                buffer = await CrearDocumentosRepository.crear_reporte_predios_contenedor(contenedorData[0], sortItemsPallet)
                const base64 = buffer.toString('base64');

                return {
                    file: base64,
                    filename: `reporte_predios_${contenedorData[0].numeroContenedor}_${Date.now()}.xlsx`,
                    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            }
        })

    }
    static async get_inventarios_historiales_listasDeEmpaque_itemPallets(req) {
        return await executeQueryTask(async () => {

            const { contenedor } = req.data
            const pallets = await ContenedoresRepository.getItemsPallets({
                query: { contenedor: contenedor },
                populate:
                    [
                        { path: 'calidad', select: 'nombre descripcion' },
                        { path: 'pallet', select: 'numeroPallet' },
                        { path: 'contenedor', select: 'numeroContenedor infoContenedor' },
                        { path: 'tipoFruta', select: 'tipoFruta' },
                        {
                            path: 'lote',
                            select: 'enf predio finalizado GGN',
                            populate: {
                                path: 'predio',
                                select: 'PREDIO GGN ICA',

                            }
                        }
                    ]

            });

            const sortItemsPallet = pallets.sort((a, b) => {
                return a.pallet.numeroPallet - b.pallet.numeroPallet;
            });

            return sortItemsPallet
        });
    }
    static async get_inventarios_historiales_listasDeEmpaque(req) {
        return await executeQueryTask(async () => {
            const { data } = req;
            const { page } = data
            const resultsPerPage = 25;
            const contenedores = await ContenedoresRepository.get_Contenedores_sin_lotes({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                populate: [
                    {
                        path: 'infoContenedor.clienteInfo',
                        select: 'CLIENTE',
                    },
                    {
                        path: 'infoContenedor.calidad',
                        select: 'nombre descripcion',
                    },
                    {
                        path: 'registrosSalidas',
                        select: 'datalogger_id',
                    },
                                        {
                        path: 'infoContenedor.tipoFruta',
                        select: 'tipoFruta exportName',
                    },
                ],
                select: {
                    infoContenedor: 1,
                    __v: 1,
                    numeroContenedor: 1
                },
                query: {
                    "infoContenedor.fechaFinalizado": { $ne: null }
                }
            })
            return contenedores
        })
    }
}