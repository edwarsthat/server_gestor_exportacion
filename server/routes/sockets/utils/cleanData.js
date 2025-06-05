
function cleanForRust(obj) {
    return JSON.parse(JSON.stringify(obj, (_, value) => {
        if (
            value === undefined ||
            typeof value === 'function' ||
            typeof value === 'symbol' ||
            typeof value === 'bigint' ||
            Number.isNaN(value) ||
            value === Infinity ||
            value === -Infinity
        ) {
            return null; // puedes elegir eliminarlo (return undefined) si prefieres
        }
        return value;
    }));
}

export {
    cleanForRust
}