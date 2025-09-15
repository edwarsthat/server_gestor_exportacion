import mongoose from 'mongoose';
const { isValidObjectId, Types } = mongoose;

export const toObjId = (v, name = 'id') => {
    const s = v == null ? '' : String(v).trim();
    if (!isValidObjectId(s)) throw new Error(`${name} inválido: "${s}"`);
    return new Types.ObjectId(s);
};