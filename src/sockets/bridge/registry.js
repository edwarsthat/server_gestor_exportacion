import { contenedorEmitter } from "../../../events/emitters.js";
import { CONTENEDOR_EVENTS } from "../../../events/modules/contenedor.js";

export const REGISTRY = [
    { emitter: contenedorEmitter, events: CONTENEDOR_EVENTS },
];
