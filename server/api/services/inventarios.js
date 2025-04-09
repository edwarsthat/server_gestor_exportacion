const { ProveedoresRepository } = require("../../Class/Proveedores");

async function ajustarCanastillasProveedor(predio, cantidad) {
    if (!predio || cantidad === 0) return;

    const proveedores = await ProveedoresRepository.get_proveedores({
        query: { PREDIO: predio },
        select: { canastillas: 1 }
    });

    if (proveedores.length === 0) return;

    const proveedor = proveedores[0];
    const cantidadActual = Number(proveedor.canastillas ?? 0);

    if (!Number.isFinite(cantidadActual)) {
        console.error(`Valor no numérico en proveedor.canastillas:`, proveedor.canastillas);
        throw new Error("El valor actual de canastillas no es numérico.");
    }

    if (cantidadActual + cantidad < 0) {
        console.error(`No se puede ajustar canastillas a un valor negativo: ${cantidadActual} + ${cantidad}`);
        throw new Error("El ajuste de canastillas no puede resultar en un valor negativo.");
    }

    const newCanastillas = cantidadActual + cantidad;

    await ProveedoresRepository.modificar_proveedores(
        { _id: proveedor._id },
        { $set: { canastillas: newCanastillas } }
    );
}

module.exports = {
    ajustarCanastillasProveedor
}