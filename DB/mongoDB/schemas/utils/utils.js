export function diffObjects(obj1, obj2, path = "") {
    const changes = [];
    for (const key of new Set([...Object.keys(obj1), ...Object.keys(obj2)])) {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof obj1[key] === "object" && typeof obj2[key] === "object" && obj1[key] && obj2[key]) {
            changes.push(...diffObjects(obj1[key], obj2[key], fullPath));
        } else if (obj1[key] !== obj2[key]) {
            changes.push({ field: fullPath, before: obj1[key], after: obj2[key] });
        }
    }
    return changes;
}

// deepDiff.js
export function deepDiff(before = {}, after = {}, path = "") {
    const out = [];
    const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

    for (const k of keys) {
        const full = path ? `${path}.${k}` : k;
        const aa = before?.[k];
        const bb = after?.[k];
        const a = toComparable(aa);
        const b = toComparable(bb);

        if (Array.isArray(a) && Array.isArray(b)) {
            const L = Math.max(a.length, b.length);
            for (let i = 0; i < L; i++) {
                const p = `${full}[${i}]`;
                if (i >= a.length) out.push({ field: p, before: undefined, after: b[i] });
                else if (i >= b.length) out.push({ field: p, before: a[i], after: undefined });
                else if (typeof a[i] === 'object' && typeof b[i] === 'object') {
                    out.push(...deepDiff(a[i], b[i], p));
                } else if (!Object.is(a[i], b[i])) {
                    out.push({ field: p, before: a[i], after: b[i] });
                }
            }
        } else if (typeof a === 'object' && a && typeof b === 'object' && b) {
            out.push(...deepDiff(a, b, full));
        } else if (!Object.is(a, b)) {
            out.push({ field: full, before: a, after: b });
        }
    }
    return out;
}

// const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

const isPlainObject = (v) => Object.prototype.toString.call(v) === '[object Object]';
const isObjectId = (v) =>
    v && (
        v.constructor?.name === 'ObjectId' ||          // mongoose
        v._bsontype === 'ObjectID' || v._bsontype === 'ObjectId' // bson
    );

function toComparable(val) {
    if (val == null) return val;

    if (isObjectId(val)) return String(val);             // <- ¡clave!
    if (val instanceof Date) return val.toISOString();   // estabilidad
    if (Buffer?.isBuffer?.(val)) return { __type: 'Buffer', base64: val.toString('base64') };

    if (Array.isArray(val)) return val.map(toComparable);
    if (isPlainObject(val)) {
        const out = {};
        for (const k of Object.keys(val)) out[k] = toComparable(val[k]);
        return out;
    }
    return val;
}