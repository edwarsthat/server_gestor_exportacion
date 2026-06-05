import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineInventarioSimple = async (conn, AuditInventariosSimples) => {
    const ItemInventarioSchema = new Schema({
        lote: { type: Schema.Types.ObjectId, ref: "Lote", required: true },
        canastillas: { type: Number, required: true, min: 0, default: 0 },
    }, { _id: false });

    const ItemInventarioMaquilaSchema = new Schema({
        lote: { type: Schema.Types.ObjectId, ref: "loteMaquila", required: true },
        canastillas: { type: Number, required: true, min: 0, default: 0 },
    }, { _id: false });

    ItemInventarioSchema.index({ lote: 1 }, { unique: true, sparse: true });

    const InventarioSimpleSchema = new Schema({
        nombre: { type: String, required: true, unique: true },
        descripcion: { type: String, default: "" },
        updatedAt: { type: Date, default: () => new Date() },
        inventario: { type: [ItemInventarioSchema], default: [] },
        inventarioMaquila: { type: [ItemInventarioMaquilaSchema], default: [] },
        ordenVaceo: [{ type: Schema.Types.ObjectId, ref: "Lote" }],
        canastillasTotal: { type: Number, min: 0, default: 0 },
        canastillasPrestadas: {
            type: Map,
            of: { type: Number, min: [0, 'Las canastillas prestadas no pueden ser negativas'] },
            default: () => new Map()
        }
    }, {
        timestamps: { updatedAt: 'updatedAt', createdAt: false },
        versionKey: '__v'
    });

    // ✔ Actualiza updatedAt también en updates tipo query
    InventarioSimpleSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function () {
        const update = this.getUpdate();
        if (Array.isArray(update)) {
            // Mongoose 9+: this.set() lanza error con pipeline updates, hay que modificar el array directamente
            const lastStage = update[update.length - 1];
            if (lastStage?.$set) {
                lastStage.$set.updatedAt = new Date();
            } else {
                update.push({ $set: { updatedAt: new Date() } });
            }
        } else {
            this.set({ updatedAt: new Date() });
        }
    });

    // ✔ Captura del documento previo dentro de la MISMA sesión
    InventarioSimpleSchema.pre('findOneAndUpdate', async function () {
        const opts = this.getOptions?.() || this.options || {};
        const session = opts.session;

        // Importante: leer con la misma session para snapshot consistente
        const q = this.model.findOne(this.getQuery());
        if (session) q.session(session);

        const docToUpdate = await q.lean(); // lean para clonar ligero
        this._oldValue = docToUpdate || null;
    });

    // ✔ Audit dentro de la misma sesión (si no se pide skip)
    InventarioSimpleSchema.post('findOneAndUpdate', async function (res) {
        try {
            const opts = this.getOptions?.() || this.options || {};
            if (opts.skipAudit) return;

            const session = opts.session; // misma sesión de la TX
            const user = opts.user || 'System';
            const operation = opts.operation || 'update';
            const action = opts.action || 'findOneAndUpdate';

            if (this._oldValue && res) {
                const oldArr = Array.isArray(this._oldValue.inventario) ? this._oldValue.inventario : [];
                const newArr = Array.isArray(res.inventario) ? res.inventario : [];

                // Suma total de canastillas antes/después
                const sum = arr => arr.reduce((a, it) => a + (Number(it.canastillas) || 0), 0);
                const totalBefore = sum(oldArr);
                const totalAfter = sum(newArr);
                const deltaTotal = totalAfter - totalBefore;

                // Cambios por lote (opcional y útil)
                const mapByLote = (arr) => {
                    const m = new Map();
                    for (const it of arr) m.set(String(it.lote), Number(it.canastillas) || 0);
                    return m;
                };
                const beforeMap = mapByLote(oldArr);
                const afterMap = mapByLote(newArr);

                const perLote = [];
                const touched = new Set([...beforeMap.keys(), ...afterMap.keys()]);
                for (const k of touched) {
                    const b = beforeMap.get(k) ?? 0;
                    const a = afterMap.get(k) ?? 0;
                    const d = a - b;
                    if (d !== 0) perLote.push({ lote: k, delta: d, before: b, after: a });
                }

                const description =
                    (opts.description) ??
                    `Cambio inventario: Δ=${deltaTotal} canastillas (antes ${totalBefore}, ahora ${totalAfter}). ` +
                    (perLote.length
                        ? `Detalles: ${perLote.map(x => `[${x.lote}: ${x.before}→${x.after} (Δ${x.delta})]`).join(' ')}`
                        : 'Sin cambios por-lote.');

                // Escribe audit con la MISMA sesión (queda dentro de la TX)
                await AuditInventariosSimples.create([{
                    documentId: this._oldValue._id,
                    operation,
                    user,
                    action,
                    description
                }], { session });
            }

            return;
        } catch (err) {
            // No mates el server por el audit: log y continua
            console.error('Error guardando auditoría:', err);
            return err; // o return () si quieres que el audit no rompa la operación
        }
    });

    InventarioSimpleSchema.pre('updateOne', async function () {
        try {
            const opts = this.getOptions?.() || this.options || {};
            const session = opts.session;

            const q = this.model.findOne(this.getFilter()); // <-- mismo filtro del update
            if (session) q.session(session);

            const docToUpdate = await q.lean();
            this._oldValue = docToUpdate || null;  // guardar snapshot previo
        } catch (err) {
            return err;
        }
    });
    // === NUEVO: Auditoría después de updateOne (leer el "después" y comparar) ===
    InventarioSimpleSchema.post('updateOne', async function (result) {
        try {
            const opts = this.getOptions?.() || this.options || {};
            if (opts.skipAudit) return;

            // Si no tocó nada, no auditar
            if (!result?.acknowledged || !result?.matchedCount) return;

            const session = opts.session;
            const user = opts.user || 'System';
            const operation = opts.operation || 'update';
            const action = opts.action || 'updateOne';

            // Leemos el documento actualizado con el MISMO filtro y sesión
            const q = this.model.findOne(this.getFilter());
            if (session) q.session(session);

            const newValue = await q.lean();
            const oldValue = this._oldValue || null;

            // --- mismo cálculo de deltas que ya usas en findOneAndUpdate ---
            const toArr = (v) => Array.isArray(v?.inventario) ? v.inventario : [];
            const sum = arr => arr.reduce((a, it) => a + (Number(it.canastillas) || 0), 0);

            const oldArr = toArr(oldValue);
            const newArr = toArr(newValue);

            const totalBefore = sum(oldArr);
            const totalAfter = sum(newArr);
            const deltaTotal = totalAfter - totalBefore;

            const mapByLote = (arr) => {
                const m = new Map();
                for (const it of arr) m.set(String(it.lote), Number(it.canastillas) || 0);
                return m;
            };
            const beforeMap = mapByLote(oldArr);
            const afterMap = mapByLote(newArr);

            const perLote = [];
            const touched = new Set([...beforeMap.keys(), ...afterMap.keys()]);
            for (const k of touched) {
                const b = beforeMap.get(k) ?? 0;
                const a = afterMap.get(k) ?? 0;
                const d = a - b;
                if (d !== 0) perLote.push({ lote: k, delta: d, before: b, after: a });
            }

            const description =
                (opts.description) ??
                `Cambio inventario: Δ=${deltaTotal} canastillas (antes ${totalBefore}, ahora ${totalAfter}). ` +
                (perLote.length
                    ? `Detalles: ${perLote.map(x => `[${x.lote}: ${x.before}→${x.after} (Δ${x.delta})]`).join(' ')}`
                    : 'Sin cambios por-lote.');

            // Escribe el audit en la MISMA sesión/tx
            await AuditInventariosSimples.create([{
                documentId: (oldValue?._id || newValue?._id),
                operation,
                user,
                action,
                description
            }], { session });

            return;
        } catch (err) {
            console.error('Error guardando auditoría (updateOne):', err);
            return err; // o return () si prefieres no romper la operación por fallar el audit
        }
    });

    const InventariosSimple = conn.model("inventarioSimple", InventarioSimpleSchema);
    return InventariosSimple;
};
