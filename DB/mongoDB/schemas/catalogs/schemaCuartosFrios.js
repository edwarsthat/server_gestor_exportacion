import mongoose from "mongoose";
const { Schema } = mongoose;


export const defineCuartosFrios = async (conn, AuditCuartosFrios) => {

    const schemaTotalFruta = new Schema({
        kilos: { type: Number, required: true },
        cajas: { type: Number, required: true }
    })

    const CuartoFrioSchema = new Schema({
        nombre: { type: String, required: true },
        inventario: [mongoose.Schema.Types.ObjectId],
        lastUpdated: Date,
        totalFruta: {
            type: Map,
            of: schemaTotalFruta // también puede ser of: new Schema({...})
        }
    });


    CuartoFrioSchema.pre('findOneAndUpdate', async function (next) {
        const docToUpdate = await this.model.findOne(this.getQuery());
        this._oldValue = docToUpdate ? docToUpdate.toObject() : null;

        next();
    });


    CuartoFrioSchema.post('findOneAndUpdate', async function (res) {
        try {
            if (this.options?.skipAudit) return;
            if (this._oldValue && res) {
                const oldInventario = this._oldValue.inventario.length;
                const newInventario = res.inventario.length;
                const diff = newInventario - oldInventario;

                await AuditCuartosFrios.create({
                    documentId: this._oldValue._id,
                    operation: this.options.operation || 'update',// 'Ingreso de Cajas', 'Salida de Cajas'
                    user: this.options.user || 'System',
                    action: this.options.action || 'findOneAndUpdate',
                    description: this.options.description || `Cambio de inventario: ${diff > 0 ? `+${diff}` : diff} cajas. Antes: ${oldInventario}, Ahora: ${newInventario}.`
                });
            }
        } catch (err) {
            console.error('Error guardando auditoría:', err);
        }
    });


    const CuartoFrio = conn.model("FrioCuarto", CuartoFrioSchema);
    return CuartoFrio

}
