export const decimalToComma = (num) => {
    if (typeof num !== 'number') return num
    return num.toFixed(2).replace('.', '.');
};