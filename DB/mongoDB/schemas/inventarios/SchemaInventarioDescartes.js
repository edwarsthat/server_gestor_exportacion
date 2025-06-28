import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineInventarioDescarte = async (conn) => {
    const kilosDescarteSchema = new Schema(
        {},
        {
            _id: false,
            strict: false, // necesario para permitir claves dinámicas
            typePojoToMixed: false // opcional: evita conversión automática a Mixed
        }
    );

    kilosDescarteSchema.add(
        new Map([
            [
                String, // Nivel 1: tipoFruta
                new Map([
                    [
                        String, // Nivel 2: tipo descarte (descarteLavado , descarteEncerado )
                        new Map([
                            [String, Number] // Nivel 3: tipo de descarte (balin, extra, etc..) -> valor numérico
                        ])
                    ]
                ])
            ]
        ])
    );


    const InventarioDescarteSchema = new Schema({
        fecha: { type: Date, default: () => new Date() },
        inventario: kilosDescarteSchema,
        kilos_ingreso: kilosDescarteSchema,
        kilos_salida: kilosDescarteSchema,
    })

    const InvetariosDescarte = conn.model("inventarioDescarte", InventarioDescarteSchema);
    return InvetariosDescarte;
}

