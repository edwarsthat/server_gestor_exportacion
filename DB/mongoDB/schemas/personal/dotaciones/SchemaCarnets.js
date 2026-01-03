import mongoose from "mongoose";
import { CARNET_STATUSES, CARNET_TYPES } from "../../../../../constants/personal.js";
const { Schema } = mongoose;

export const defineSchemaCarnets = async (conn) => {

    const carnetSchema = new Schema({
        type: {
            type: String,
            enum: CARNET_TYPES,
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: CARNET_STATUSES,
            required: true,
            default: "stock",
            index: true,
        },
        employeeId: {
            type: Schema.Types.ObjectId,
            ref: "personal",
            default: null,
            index: true,
        },
        tokenHash: {
            type: String,
            required: true,
            select: false, // por defecto no lo devuelve en queries
        },

        issuedAt: { type: Date, default: null, index: true },
        expiresAt: { type: Date, default: null, index: true },

        createdBy: { type: Schema.Types.ObjectId, ref: "usuario", default: null },
        assignedBy: { type: Schema.Types.ObjectId, ref: "usuario", default: null },

        notes: { type: String, default: "" },
    }, { timestamps: true })

    carnetSchema.index(
        { employeeId: 1, type: 1, status: 1 },
        {
            unique: true,
            partialFilterExpression: { status: "active", employeeId: { $type: "objectId" } },
        }
    );
    carnetSchema.index(
        { tokenSelector: 1 }, { unique: true }
    );

    const Carnet = conn.model("carnet", carnetSchema);

    return Carnet

}

