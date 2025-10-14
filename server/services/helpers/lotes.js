export function calcularTotalDescarte(descarte) {
    if (!descarte || typeof descarte !== 'object') {
        return 0;
    }
    
    return Object.values(descarte).reduce((total, valor) => {
        // Verificar si el valor es un número válido
        const numero = Number(valor);
        return total + (isNaN(numero) ? 0 : numero);
    }, 0);
}