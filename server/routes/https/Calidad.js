import express from 'express';
import { UserRepository } from '../../auth/users.js';
import { AccessError } from '../../../Error/ValidationErrors.js';
import { CalidadRepository } from '../../api/Calidad.js';


export const routerCalidad = express.Router();

routerCalidad.get("/", (req, res) => {
    console.log(req)
    res.send("Calidad")
});

//#region ingresos calidad
routerCalidad.get("/get_calidad_ingresos_higienePersonal", async (req, res) => {
    try {
        const token = req.headers['authorization'];

        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, 'get_calidad_ingresos_higienePersonal')

        const operarios = await CalidadRepository.get_calidad_ingresos_higienePersonal()

        res.send({ status: 200, message: 'Ok', data: operarios })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})
routerCalidad.post("/post_calidad_ingresos_higienePersonal", async (req, res) => {
    try {
        console.log(req.body)
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, "post_calidad_ingresos_higienePersonal")

        const data = {
            data: req.body,
            user: user
        }
        await CalidadRepository.post_calidad_ingresos_higienePersonal(data)

        res.json({ status: 200, message: 'Ok' })

    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
//#endregion
//#region proceso
routerCalidad.get("/get_lotes_clasificacion_descarte", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const { cargo, user } = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(cargo, 'get_lotes_clasificacion_descarte', user)

        const data = await CalidadRepository.get_calidad_ingresos_clasificacionDescarte();
        res.json({ status: 200, message: 'Ok', data: data });
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
});
routerCalidad.get("/get_formularios_calidad_creados", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const { user, cargo } = await UserRepository.authenticateToken(token);

        const autorizado2 = await UserRepository.autentificacionPermisosHttps(cargo, "get_formularios_calidad_creados");
        if (!autorizado2) {
            throw new AccessError(412, `Acceso no autorizado obtener_historial_decarte_lavado_proceso`);
        }

        const data = await CalidadRepository.get_formularios_calidad_creados(user);
        res.json({ status: 200, message: 'Ok', data: data });
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})
routerCalidad.get("/get_calidad_reclamaciones_contenedores", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        const autorizado2 = await UserRepository.autentificacionPermisosHttps(user.cargo, "get_calidad_reclamaciones_contenedores");
        if (!autorizado2) {
            throw new AccessError(412, `Acceso no autorizado obtener_historial_decarte_lavado_proceso`);
        }
        const data = req.body
        const response = await CalidadRepository.get_calidad_reclamaciones_contenedores(data);
        res.json({ status: 200, message: 'Ok', data: response });
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})
routerCalidad.get("/get_calidad_reclamaciones_contenedores_numeroElementos", async (req, res) => {
    try {
        const response = await CalidadRepository.get_calidad_reclamaciones_contenedores_numeroElementos();
        res.json({ status: 200, message: 'Ok', data: response });
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})
routerCalidad.put("/put_lotes_clasificacion_descarte", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);

        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action, user.user)

        const data = {
            data: {
                ...req.body
            },
            user: user
        }
        await CalidadRepository.put_calidad_ingresos_clasificacionDescarte(data)

        res.send({ status: 200, message: 'Ok' })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
});
routerCalidad.put("/add_item_formulario_calidad", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);

        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action, user.user)
        await CalidadRepository.add_item_formulario_calidad(req.body, user._id)

        res.send({ status: 200, message: 'Ok' })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
});

//#endregion