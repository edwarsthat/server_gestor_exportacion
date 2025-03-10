
const transformObjectInventarioDescarte = async (obj) => {
    const result = {};

    for (const key in obj) {
        if (key === '_id') {
            result[key] = obj[key];
            continue;
        }

        const [mainKey, subKey] = key.split('.');
        if (!result[mainKey]) {
            result[mainKey] = {};
        }

        result[mainKey][subKey] = -obj[key];
    }

    return result;
};

module.exports = {
    transformObjectInventarioDescarte
}