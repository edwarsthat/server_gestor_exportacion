import { z } from "zod";
import { filtroSchema } from "./utils/validateFiltros.js";

export class DataValidations {
    static documento_personal() {
        return z.object({
            filtro: filtroSchema,
        })
    }
}