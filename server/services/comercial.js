
export class ComercialService {
    static async crear_contenedor(data) {
        const subDocumentos = []
        for (let i = 1; i <= Number(data.numeroPallets); i++) {
            const subDocumento = {
                EF1: [],
                listaLiberarPallet: {
                    rotulado: false,
                    paletizado: false,
                    enzunchado: false,
                    estadoCajas: false,
                    estiba: false,
                },
                settings: {
                    tipoCaja: "",
                    calidad: "",
                    calibre: "",
                },
            };

            subDocumentos.push(subDocumento);
        }
        return {
            numeroContenedor: Number(data.numeroContenedor),
            infoContenedor: {
                clienteInfo: data.cliente,
                tipoFruta: data.tipoFruta,
                fechaCreacion: new Date(),
                fechaEstimadaCargue: new Date(data.fechaEstimadaCargue),
                fechaFinalizado: '',
                fechaSalida: '',
                fechaInicio: new Date(data.fechaInicioProceso),
                observaciones: data.observaciones,
                cerrado: false,
                tipoCaja: data.tipoCaja,
                calidad: data.calidad,
                calibres: data.calibres,
                sombra: data.sombra,
                defecto: data.defecto,
                mancha: data.mancha,
                verdeManzana: data.verdeManzana,
                cajasTotal: Number(data.cajasTotal),
                rtoEstimado: data.rtoEstimado,
                ultimaModificacion: new Date(),
            },
            pallets: subDocumentos,
        }
    }
}