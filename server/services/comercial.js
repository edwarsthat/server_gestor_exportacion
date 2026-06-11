import mongoose from "mongoose";

export class ComercialService {
    static crear_contenedor(data) {
        const [annoStr, semanaStr] = data.semana.split('-W');
        const anno = parseInt(annoStr, 10);
        const semana = parseInt(semanaStr, 10);
        return {
            ordenCompra: data.ordenCompra,
            infoContenedor: {
                clienteInfo: data.clienteInfo,
                pais_destino: data.paisDestino,
                GGN: data.GGN,
                ICA: data.ICA,
                tipoFruta: data.tipoFruta,
                fechaCreacion: new Date(),
                observaciones: data.observaciones,
                cerrado: false,
                tipoCaja: data.tipoCaja,
                calidades: data.calidades,
                cajasTotal: data.cajasTotal ? Number(data.cajasTotal) : undefined,
                ultimaModificacion: new Date(),
                maquila: data.maquila,
                semana,
                anno
            },
            pallets: 0,
            GGN: data.GGN,
            pais_destino: new mongoose.Types.ObjectId(data.paisDestino),
        }
    }
    static async poner_precio_lotes(itemPallets, calidades) {
        let enfs = Object.create(null);
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
        let enfs = Object.create(null);
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