// auditPlugin.js
import { deepDiff } from "./utils.js";

export function makeAuditPlugin({ collectionName, AuditLogs }) {
    // Usa tu mismo modelo “AuditLog” ya definido en tu proyecto

    return function auditPlugin(schema) {

        // Helpers
        const writeLog = async (entry, session = null) => {
            try { 
                if (session) {
                    await AuditLogs.create([entry], { session });
                } else {
                    await AuditLogs.create(entry);
                }
            }
            catch (e) { console.error("[AuditLog] error:", e?.message); }
        };
        const getAuditCtx = (ctx) => {
            // Query: this.getOptions(); Doc: this.$locals
            const q = typeof ctx.getOptions === "function" ? ctx.getOptions() : {};
            const auditData = (q && q.$audit) || (ctx.$locals && ctx.$locals.$audit) || {};
            // Extraer session si está disponible en las opciones
            const session = q?.session || ctx.$locals?.session || null;
            return { ...auditData, session };
        };
        function setByPath(obj, path, value) {
            const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
            let cur = obj;
            for (let i = 0; i < parts.length - 1; i++) {
                const p = parts[i];
                if (!(p in cur) || typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {};
                cur = cur[p];
            }
            cur[parts[parts.length - 1]] = value;
        }
        function pickChanged(before, after, changes) {
            const oldChanged = {};
            const newChanged = {};
            for (const c of changes) {
                setByPath(oldChanged, c.field, c.before);
                setByPath(newChanged, c.field, c.after);
            }
            return { oldChanged, newChanged };
        }

        // ---------- SAVE (create/update con doc.save) ----------
        schema.pre("save", { document: true, query: false }, async function () {
            if (this.isNew) {
                this.$locals._before = null;
            } else {
                const original = await this.constructor.findById(this._id).lean();
                this.$locals._before = original || null;
            }
        });

        schema.post("save", { document: true, query: false }, async function (doc) {
            const before = this.$locals._before;
            const after = doc.toObject({ depopulate: true });
            const op = "create";
            const changes = before ? deepDiff(before, after) : [];
            const { user, action, description, session } = (this.$locals.$audit || {});

            const { oldChanged, newChanged } = op === 'update'
                ? pickChanged(before || {}, after || {}, changes)
                : { oldChanged: undefined, newChanged: after };

            await writeLog({
                coleccion: collectionName,
                documentId: doc._id,
                operation: op,
                user,
                action,
                oldValue: oldChanged,
                newValue: newChanged,
                changes,
                description
            }, session);
        });

        // ---------- findOneAndUpdate / findOneAndReplace ----------
        schema.pre('deleteMany', async function (next) {
            try {
                const docsToDelete = await this.model.find(this.getQuery());
                this._docsToDelete = docsToDelete.map(d => d.toObject({ depopulate: true }));
                next();
            } catch (err) {
                console.error('Error capturando documentos para eliminar:', err);
                next(err);
            }
        });

        schema.post('deleteMany', async function () {
            try {
                if (!this._docsToDelete || this._docsToDelete.length === 0) return;

                const session = this.options?.session || null;
                const logs = this._docsToDelete.map(doc => ({
                    collection: 'Lote',
                    documentId: doc._id,
                    operation: 'delete',
                    user: this.options?.user,
                    oldValue: doc,
                    description: 'Eliminación de lote'
                }));

                if (session) {
                    await AuditLogs.insertMany(logs, { session });
                } else {
                    await AuditLogs.insertMany(logs);
                }
            } catch (err) {
                console.error('Error guardando auditoría:', err);
            }
        });

        schema.pre('findOneAndUpdate', async function (next) {
            const docToUpdate = await this.model.findOne(this.getQuery());
            this._oldValue = docToUpdate ? docToUpdate.toObject({ depopulate: true }) : null;
            next();
        });

        schema.post('findOneAndUpdate', async function (res) {
            try {
                if (this.options?.skipAudit) return;
                if (this._oldValue && res) {

                    // Solo los cambios, no el pergamino completo
                    const cambios = deepDiff(this._oldValue, res.toObject({ depopulate: true }));
                    if (cambios.length > 0) {
                        const session = this.options?.session || null;
                        await writeLog({
                            collection: collectionName,
                            documentId: res._id,
                            operation: 'update',
                            user: this.options.user,
                            action: this.options.action,
                            changes: cambios,
                            description: this.options.description,
                        }, session);
                    }
                }
            } catch (err) {
                console.error('Error guardando auditoría:', err);
            }
        });
        // ---------- updateOne/updateMany (resumen, sin before/after) ----------
        schema.post(["updateOne", "updateMany"], { query: true }, async function (res) {
            const { user, action, description, session } = getAuditCtx(this);
            await writeLog({
                coleccion: collectionName,
                operation: "bulk-update",
                user,
                action,
                oldValue: undefined,
                newValue: { acknowledged: res?.acknowledged, matchedCount: res?.matchedCount, modifiedCount: res?.modifiedCount },
                changes: [],
                description
            }, session);
        });

        // ---------- findOneAndDelete / findOneAndRemove ----------
        // schema.pre(["findOneAndDelete", "findOneAndRemove"], { query: true }, async function () {
        //     const before = await this.model.findOne(this.getQuery()).lean();
        //     this.set("_toDelete", before || null);
        // });

        // schema.post(["findOneAndDelete", "findOneAndRemove"], { query: true }, async function (resDoc) {
        //     const before = this.get("_toDelete");
        //     const { user, action, description } = getAuditCtx(this);
        //     await writeLog({
        //         coleccion: collectionName,
        //         documentId: before?._id || resDoc?._id,
        //         operation: "delete",
        //         user,
        //         action,
        //         oldValue: before ?? undefined,
        //         newValue: undefined,
        //         changes: [],
        //         description
        //     });
        // });

        // ---------- deleteOne(doc) ----------
        schema.pre("deleteOne", { document: true }, async function () {
            this.$locals._toDelete = this.toObject({ depopulate: true });
        });
        schema.post("deleteOne", { document: true }, async function () {
            const { user, action, description, session } = (this.$locals.$audit || {});
            await writeLog({
                coleccion: collectionName,
                documentId: this._id,
                operation: "delete",
                user,
                action,
                oldValue: this.$locals._toDelete ?? undefined,
                newValue: undefined,
                changes: [],
                description
            }, session);
        });

        // ---------- deleteMany (resumen) ----------
        // schema.post("deleteMany", { query: true }, async function (res) {
        //     const { user, action, description } = getAuditCtx(this);
        //     await writeLog({
        //         coleccion: collectionName,
        //         operation: "bulk-delete",
        //         user,
        //         action,
        //         oldValue: undefined,
        //         newValue: { acknowledged: res?.acknowledged, deletedCount: res?.deletedCount },
        //         changes: [],
        //         description
        //     });
        // });

        // ---------- insertMany (resumen) ----------
        schema.post("insertMany", async function (docs) {
            // Obtener session de los argumentos si existe
            const session = arguments[1]?.session || null;
            await writeLog({
                coleccion: collectionName,
                operation: "bulk-insert",
                user: undefined,
                action: "insertMany",
                oldValue: undefined,
                newValue: (docs || []).map(d => d.toObject ? d.toObject({ depopulate: true }) : d),
                changes: [],
                description: `Insertados ${docs?.length || 0} documentos`
            }, session);
        });
    };
}
