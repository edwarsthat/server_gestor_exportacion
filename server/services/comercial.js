

export class ComercialService {
    static async crear_contenedor(data) {
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
            pallets: 0,
        }
    }
    static async poner_precio_lotes(itemPallets, calidades) {
        let enfs = {};
        for (const item of itemPallets) {
            const precio = item.lote.precio?.exportacion.get(item.calidad._id) || 0;
            const enf = item.lote.enf
            if (!enfs[enf]) {
                enfs[enf] = { _id: enf, nombre: item.lote.predio.PREDIO, tipoFruta: item.tipoFruta };
                calidades.forEach(c => enfs[enf][c] = { kilos: 0, precio: 0 });
            }
            enfs[enf][item.calidad._id] = {
                kilos: (enfs[enf][item.calidad._id]?.kilos || 0) + (item.kilos || 0),
                precio: (enfs[enf][item.calidad._id]?.precio || 0) + ((item.kilos || 0) * precio),
            };
        }

        const resultado = Object.values(enfs).map(item => item);

        return { costo: resultado, tipo: "lote" }
    }
    static async poner_precio_contenedores(itemPallets, calidades) {
        let enfs = {};
        for (const item of itemPallets) {
            const precio = item.lote?.precio?.exportacion?.get(item.calidad._id) || 0;
            const enf = item.contenedor.numeroContenedor
            if (!enfs[enf]) {
                enfs[enf] = { _id: enf, nombre: item.contenedor.infoContenedor.clienteInfo.CLIENTE };
                calidades.forEach(c => enfs[enf][c] = { kilos: 0, precio: 0 });
            }
            enfs[enf][item.calidad._id] = {
                kilos: (enfs[enf][item.calidad._id]?.kilos || 0) + (item.kilos || 0),
                precio: (enfs[enf][item.calidad._id]?.precio || 0) + ((item.kilos || 0) * precio),
            };
        }
        const resultado = Object.values(enfs).map(item => item);

        return { costo: resultado, tipo: "contenedor" }
    }
}