import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineInventarioSimple = async (conn, AuditInventariosSimples) => {
    const ItemInventarioSchema = new Schema({
        lote: { type: Schema.Types.ObjectId, ref: "Lote", required: true },
        canastillas: { type: Number, required: true, min: 0, default: 0 },
    }, { _id: false });

    ItemInventarioSchema.index({ lote: 1 }, { unique: true, sparse: true });

    const InventarioSimpleSchema = new Schema({
        nombre: { type: String, required: true, unique: true },
        descripcion: { type: String, default: "" },
        updatedAt: { type: Date, default: () => new Date() },
        inventario: { type: [ItemInventarioSchema], default: [] },
        ordenVaceo: [{ type: Schema.Types.ObjectId, ref: "Lote" }],
    }, {
        timestamps: { updatedAt: 'updatedAt', createdAt: false }
    });

    // ✔ Actualiza updatedAt también en updates tipo query
    InventarioSimpleSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
        // En query middleware, set() aplica sobre el update
        this.set({ updatedAt: new Date() });
        next();
    });

    // ✔ Captura del documento previo dentro de la MISMA sesión
    InventarioSimpleSchema.pre('findOneAndUpdate', async function (next) {
        try {
            const opts = this.getOptions?.() || this.options || {};
            const session = opts.session;

            // Importante: leer con la misma session para snapshot consistente
            const q = this.model.findOne(this.getQuery());
            if (session) q.session(session);

            const docToUpdate = await q.lean(); // lean para clonar ligero
            this._oldValue = docToUpdate || null;
            next();
        } catch (err) {
            next(err);
        }
    });

    // ✔ Audit dentro de la misma sesión (si no se pide skip)
    InventarioSimpleSchema.post('findOneAndUpdate', async function (res, next) {
        try {
            const opts = this.getOptions?.() || this.options || {};
            if (opts.skipAudit) return next();

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

            next();
        } catch (err) {
            // No mates el server por el audit: log y continua
            console.error('Error guardando auditoría:', err);
            next(err); // o next() si quieres que el audit no rompa la operación
        }
    });

    InventarioSimpleSchema.pre('updateOne', async function (next) {
        try {
            const opts = this.getOptions?.() || this.options || {};
            const session = opts.session;

            const q = this.model.findOne(this.getFilter()); // <-- mismo filtro del update
            if (session) q.session(session);

            const docToUpdate = await q.lean();
            this._oldValue = docToUpdate || null;  // guardar snapshot previo
            next();
        } catch (err) {
            next(err);
        }
    });
    // === NUEVO: Auditoría después de updateOne (leer el "después" y comparar) ===
    InventarioSimpleSchema.post('updateOne', async function (result, next) {
        try {
            const opts = this.getOptions?.() || this.options || {};
            if (opts.skipAudit) return next();

            // Si no tocó nada, no auditar
            if (!result?.acknowledged || !result?.matchedCount) return next();

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

            next();
        } catch (err) {
            console.error('Error guardando auditoría (updateOne):', err);
            next(err); // o next() si prefieres no romper la operación por fallar el audit
        }
    });

    const InventariosSimple = conn.model("inventarioSimple", InventarioSimpleSchema);
    return InventariosSimple;
};
