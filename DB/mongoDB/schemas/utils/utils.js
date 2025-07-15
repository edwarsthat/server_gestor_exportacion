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
