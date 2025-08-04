import express from 'express';
import { UserRepository } from "../auth/users.js";
import { ProcesoRepository } from "../api/Proceso.mjs";
import { VariablesDelSistema } from "../Class/VariablesDelSistema.js";
import { AccessError } from '../../Error/ValidationErrors.js';


export const routerProceso = express.Router();


//#region PUT

routerProceso.put("/add-fotos-calidad", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);

        await UserRepository.autentificacionPermisosHttps(user.cargo, "ingresar_foto_calidad")

        const data = {
            data: req.body,
            user: user
        }

        await ProcesoRepository.post_proceso_aplicaciones_fotoCalidad(data)

        res.json({ status: 200, message: 'Ok' })

    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)

        res.json({ status: err.status, message: err.message })
    }
})

//#region GET
routerProceso.get("/data_historial_descarte_lavado_proceso", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const { user, cargo } = await UserRepository.authenticateToken(token);

        const autorizado2 = await UserRepository.autentificacionPermisosHttps(cargo, "obtener_historial_decarte_lavado_proceso");
        if (!autorizado2) {
            throw new AccessError(412, `Acceso no autorizado obtener_historial_decarte_lavado_proceso`);
        }

        const data = await ProcesoRepository.obtener_historial_decarte_lavado_proceso(user);
        res.json({ status: 200, message: 'Ok', data: data });
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

routerProceso.get("/data_historial_descarte_encerado_proceso", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const { user, cargo } = await UserRepository.authenticateToken(token);

        const autorizado2 = await UserRepository.autentificacionPermisosHttps(cargo, "obtener_historial_decarte_encerado_proceso");
        if (!autorizado2) {
            throw new AccessError(412, `Acceso no autorizado obtener_historial_decarte_encerado_proceso`);
        }
        const data = await ProcesoRepository.obtener_historial_decarte_encerado_proceso(user);
        res.json({ data: data, status: 200, message: 'Ok' });
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

routerProceso.get("/lotes-fotos-calidad", async (req, res) => {
    try {
        const response = await ProcesoRepository.get_proceso_aplicaciones_fotoCalidad();
        res.json({ data: response, status: 200, message: 'Ok' })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

routerProceso.get("/data_historial_fotos_calidad_proceso", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const { user } = await UserRepository.authenticateToken(token);
        const data = await ProcesoRepository.obtener_historial_fotos_calidad_proceso(user.user);
        res.json({ data: data, status: 200, message: 'Ok' });
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

routerProceso.get("/obtenerEF1", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        await UserRepository.authenticateToken(token);
        const data = await VariablesDelSistema.generarEF1()
        res.json({ status: 200, message: 'Ok', data: data });
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

routerProceso.get("/data_obtener_foto_calidad", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        await UserRepository.authenticateToken(token);
        const archivoURL = req.query.fotoURL;
        if (!archivoURL) {
            return res.status(400).send('url archivo es requerido');
        }
        const data = await ProcesoRepository.obtener_foto_calidad(archivoURL)
        res.json({ status: 200, message: 'Ok', data: data });
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

routerProceso.get("/getInventario", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        await UserRepository.authenticateToken(token);
        const data = await ProcesoRepository.getInventario()
        res.json({ status: 200, message: 'Ok', data: data });
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})
routerProceso.get("/getInventarioDesverdizado", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        await UserRepository.authenticateToken(token);

        const data = await ProcesoRepository.getInventarioDesverdizado()
        res.json({ status: 200, message: 'Ok', data: data });
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})
routerProceso.get("/getInventario_orden_vaceo", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        await UserRepository.authenticateToken(token);

        const data = await ProcesoRepository.getInventario_orden_vaceo()
        res.json({ status: 200, message: 'Ok', data: data });
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})
routerProceso.get("/getOrdenVaceo", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        await UserRepository.authenticateToken(token);

        const oredenVaceo = await VariablesDelSistema.getOrdenVaceo()
        res.json({ status: 200, message: 'Ok', data: oredenVaceo });
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})


//#region POST
routerProceso.post("/guardarLote", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);

        await UserRepository.autentificacionPermisosHttps(user.cargo, "guardarLote")

        const data = req.body

        await ProcesoRepository.addLote({ data: data, user: user.user })

        res.json({ status: 200, message: 'Ok' })

    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})


//#region put
routerProceso.post("/directoNacional", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);

        await UserRepository.autentificacionPermisosHttps(user.cargo, "directoNacional")

        const data = req.body

        await ProcesoRepository.directoNacional(data, user.user)

        res.json({ status: 200, message: 'Ok' })

    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerProceso.post("/desverdizado", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);

        await UserRepository.autentificacionPermisosHttps(user.cargo, "desverdizado")

        const data = req.body

        await ProcesoRepository.desverdizado(data, user.user)

        res.json({ status: 200, message: 'Ok' })

    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})


