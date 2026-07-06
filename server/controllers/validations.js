import mongoose from "mongoose";

function have_lote_GGN_export(lote, contenedor) {
    try {

        // Desestructurar para acceso más limpio y validación rápida
        if (!lote.GGN) return false;
        if (!lote.predio?.GGN) return false;
        const { GGN } = lote.predio;
        let PAIS_DESTINO = contenedor.infoContenedor?.pais_destino || "";

        // Validar que exista GGN y tenga datos
        if (!GGN.paises.length) {
            return false;
        }
        if (!contenedor.infoContenedor.GGN) {
            return false;
        }
        if (union_europea.includes(PAIS_DESTINO.toString())) {
            PAIS_DESTINO = new mongoose.Types.ObjectId("699daaa6221afb642c101309");
        }


        return PAIS_DESTINO &&
            GGN.paises.some(pais => pais.equals(PAIS_DESTINO))

    } catch (err) {
        console.error("Error en validación GGN:", { error: err.message, predio: lote.predio?.GGN, tipoFruta: lote.tipoFruta });
        return false;
    }
}

async function is_finish_lote(lote) {

    if (lote.calidad) {
        if (!lote.calidad.calidadInterna) return false
        if (!lote.calidad.clasificacionCalidad) return false
        if (!lote.calidad.fotosCalidad) return false
        if (lote.deshidratacion <= -1 && lote.deshidratacion >= 2.5) return false

        return true
    }
    return false
}

export {
    have_lote_GGN_export,
    is_finish_lote
}

const union_europea = [
    "699daaa6221afb642c1012fd",
    "699daaa6221afb642c101309",
    "699daaa6221afb642c10130f"
]