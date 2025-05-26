const { obtenerEstadoDesdeAccionCanastillasInventario } = require("../api/utils/diccionarios");
const { RecordLotesRepository } = require("../archive/ArchiveLotes");
const { RecordModificacionesRepository } = require("../archive/ArchivoModificaciones");
const { ClientesRepository } = require("../Class/Clientes");
const { LotesRepository } = require("../Class/Lotes");
const { PreciosRepository } = require("../Class/Precios");
const { ProveedoresRepository } = require("../Class/Proveedores");
const { VariablesDelSistema } = require("../Class/VariablesDelSistema");

class InventariosService {

    static async obtenerPrecioProveedor(predioId, tipoFruta) {
        const proveedor = await ProveedoresRepository.get_proveedores({
            ids: [predioId],
            select: { precio: 1, PREDIO: 1, GGN: 1 }
        });

        if (!proveedor || proveedor.length === 0) {
            throw new Error("Proveedor no encontrado");
        }

        const idPrecio = proveedor[0].precio[tipoFruta];
        if (!idPrecio) {
            throw new Error(`No hay precio para la fruta ${tipoFruta}`);
        }

        const precio = await PreciosRepository.get_precios({ ids: [idPrecio] });
        if (!precio || precio.length === 0) {
            throw new Error("Precio inválido");
        }

        return { precioId: precio[0]._id, proveedor: proveedor };

    }
    static async construirQueryIngresoLote(datos, enf, precioId) {
        const fecha = new Date(datos.fecha_estimada_llegada);

        return {
            ...datos,
            precio: precioId,
            enf,
            fecha_salida_patio: fecha,
            fecha_ingreso_patio: fecha,
            fecha_ingreso_inventario: fecha,
        };
    }
    static async incrementarEF(ef) {
        if (ef.startsWith("EF1")) return VariablesDelSistema.incrementarEF1();
        if (ef.startsWith("EF8")) return VariablesDelSistema.incrementarEF8();
        throw new Error(`Código EF no válido para incrementar: ${ef}`);
    }
    static async crearRegistroInventarioCanastillas(
        {
            origen = '',
            destino = '',
            accion = '',
            canastillas = 0,
            canastillasPrestadas = 0,
            remitente = "",
            destinatario = "",
            user,
            fecha = '',
            observaciones = '',
            duenio = ''
        }
    ) {
        const estado = obtenerEstadoDesdeAccionCanastillasInventario(accion)
        return {
            fecha: new Date(fecha),
            destino: destino,
            origen: origen,
            cantidad: {
                propias: canastillas,
                // Se deja como array porque en el futuro se manejarán varios propietarios
                prestadas: [
                    {
                        cantidad: canastillasPrestadas,
                        propietario: duenio
                    }
                ]
            },
            observaciones: observaciones,
            referencia: "C1",
            tipoMovimiento: accion,
            estado: estado,
            usuario: {
                id: user._id,
                user: user.user
            },
            remitente: remitente,
            destinatario: destinatario
        }
    }
    static async ajustarCanastillasProveedorCliente(_id, cantidad) {
        if (!_id || cantidad === 0) return;

        const proveedores = await ProveedoresRepository.get_proveedores({
            ids: [_id],
            select: { canastillas: 1 }
        });

        const clientes = await ClientesRepository.get_clientesNacionales({
            ids: [_id],
            select: { canastillas: 1 }
        })

        if (proveedores.length > 0) {
            const proveedor = proveedores[0];
            const cantidadActual = Number(proveedor.canastillas ?? 0);
            const newCanastillas = cantidadActual + cantidad;
            await ProveedoresRepository.modificar_proveedores(
                { _id: proveedor._id },
                { $set: { canastillas: newCanastillas } }
            );
        } else if (clientes.length > 0) {
            const cliente = clientes[0];
            const cantidadActual = Number(cliente.canastillas ?? 0);
            const newCanastillas = cantidadActual + cantidad;
            await ClientesRepository.actualizar_clienteNacional(
                { _id: cliente._id },
                { canastillas: newCanastillas }
            );
        }
    }
    static async encontrarDestinoOrigenRegistroCanastillas(registros) {
        const destinosArr = registros.map(registro => registro.destino);
        const origenesArr = registros.map(registro => registro.origen);

        const ids = [...new Set([...destinosArr, ...origenesArr])];

        const proveedores = await ProveedoresRepository.get_proveedores({
            ids: ids
        })
        const clientes = await ClientesRepository.get_clientesNacionales({
            ids: ids
        })

        const proveedorMap = new Map(proveedores.map(p => [p._id.toString(), p]));
        const clienteMap = new Map(clientes.map(c => [c._id.toString(), c]));

        const newRegistros = []

        for (let i = 0; i < registros.length; i++) {
            const registro = registros[i].toObject()

            const proveedorOrigen = proveedorMap.get(registro.origen);
            const clienteOrigen = clienteMap.get(registro.origen);

            const proveedorDestino = proveedorMap.get(registro.destino);
            const clienteDestino = clienteMap.get(registro.destino);

            const newOrigen = proveedorOrigen?.PREDIO || clienteOrigen?.cliente || registro.origen;
            const newDestino = proveedorDestino?.PREDIO || clienteDestino?.cliente || registro.destino;

            newRegistros.push({
                ...registro,
                origen: newOrigen,
                destino: newDestino
            })
        }
        return newRegistros
    }
    static async calcularDescartesReprocesoPredio(descarteLavado, descarteEncerado) {
        const kilosDescarteLavado =
            descarteLavado === undefined ? 0 :
                Object.values(descarteLavado).reduce((acu, item) => acu -= item, 0)
        const kilosDescarteEncerado =
            descarteEncerado === undefined ? 0 :
                Object.values(descarteEncerado).reduce((acu, item) => acu -= item, 0)

        return kilosDescarteLavado + kilosDescarteEncerado;
    }
    static async modificarInventariosDescarteReprocesoPredio(_id, descarteLavado, descarteEncerado) {
        if (descarteLavado)
            await VariablesDelSistema.modificar_inventario_descarte(_id, descarteLavado, 'descarteLavado');
        if (descarteEncerado)
            await VariablesDelSistema.modificar_inventario_descarte(_id, descarteEncerado, 'descarteEncerado');
    }
    static async validarGGN(proveedor, tipoFruta, user) {
        if (!(proveedor && proveedor[0].GGN && proveedor[0].GGN.fechaVencimiento)) { throw new Error("El predio no tiene GGN") }

        const fechaVencimiento = new Date(proveedor[0].GGN.fechaVencimiento);
        const hoy = new Date();

        // Calcular la fecha de un mes después de hoy (ojo, JS hace la magia con los días)
        const unMesDespues = new Date(hoy);
        unMesDespues.setMonth(unMesDespues.getMonth() + 1);

        // Si la fecha está entre hoy y dentro de un mes, es "cercana"
        if (fechaVencimiento > hoy && fechaVencimiento <= unMesDespues) {
            if (user.Rol > 2) {
                throw new Error("La fecha de vencimiento está cercana.");
            }
        } else if (fechaVencimiento < hoy) {
            throw new Error("El GGN del proveedor ya expiró.");
        }


        if (
            proveedor[0].GGN.code &&
            proveedor[0].GGN.tipo_fruta.includes(tipoFruta)
        ) return true



        //poner filtro de la fecha
        throw new Error("El proveedor no tiene GGN para ese tipo de fruta")
    }
    static async modificarLote_regresoHistorialFrutaProcesada(_id, queryLote, user, action, kilosVaciados) {

        const lote = await LotesRepository.getLotes({ ids: [_id], select: { desverdizado: 1, kilosVaciados: 1 } })

        const newLote = await LotesRepository.modificar_lote_proceso(
            _id,
            queryLote,
            "Regreso de fruta procesada",
            user.user
        )

        await RecordModificacionesRepository.post_record_contenedor_modification(
            action,
            user,
            {
                modelo: "Lote",
                documentoId: lote[0]._id,
                descripcion: `Kilos procesados ${lote[0].kilosVaciados} se le restaron ${kilosVaciados}`,
            },
            lote,
            newLote,
            { _id, action, kilosVaciados }
        );

        return lote
    }
    static async modificarInventario_regresoHistorialFrutaProcesada(lote, inventario, action, user) {
        let inventarioOld
        let newInventario
        //modificar inventario
        if (lote[0].desverdizado) {
            inventarioOld = await VariablesDelSistema.getInventarioDesverdizado()
            await VariablesDelSistema.modificarInventario_desverdizado(lote[0]._id, -inventario)
            newInventario = await VariablesDelSistema.getInventarioDesverdizado()

        } else {
            inventarioOld = await VariablesDelSistema.getInventario()
            await VariablesDelSistema.modificarInventario(lote[0]._id, -inventario);
            newInventario = await VariablesDelSistema.getInventario()

        }
        await RecordModificacionesRepository.post_record_contenedor_modification(
            action,
            user,
            {
                modelo: "Inventario",
                descripcion: `Inventario modificado`,
            },
            inventarioOld,
            newInventario,
            { inventario }
        );

    }
    static async modificarLote_regresoHistorialFrutaIngreso(_id, queryLote, user, action) {

        const lote = await LotesRepository.getLotes({ ids: [_id] })

        const newLote = await LotesRepository.modificar_lote_proceso(
            _id,
            queryLote,
            "Modificacion ingreso fruta",
            user.user
        )

        await RecordModificacionesRepository.post_record_contenedor_modification(
            action,
            user,
            {
                modelo: "Lote",
                documentoId: lote[0]._id,
                descripcion: `Modificacion de ingreso de lote`,
            },
            lote,
            newLote,
            { _id, action, queryLote }
        );

        return lote
    }
    static async modificarRecordLote_regresoHistorialFrutaIngreso(_id, __v, data) {
        const query = {}
        Object.keys(data).forEach(item => {
            query[`documento.${item}`] = data[item]
        })
        query[`documento.fecha_ingreso_patio`] = data.fecha_ingreso_inventario
        query[`documento.fecha_salida_patio`] = data.fecha_ingreso_inventario
        query[`documento.fecha_estimada_llegada`] = data.fecha_ingreso_inventario

        await RecordLotesRepository.modificarRecord(
            _id,
            query,
            __v
        )
    }
}

module.exports.InventariosService = InventariosService