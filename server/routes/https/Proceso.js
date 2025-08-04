import express from 'express';
import { UserRepository } from '../../auth/users.js';
import { ProcesoRepository } from '../../api/Proceso.mjs';


export const routerProceso2 = express.Router();


//#region PUT
routerProceso2.post("/post_inventarios_registros_fruta_descompuesta", async (req, res) => {
    try {
        //autentificacion
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        // console.log(req.body)
        const data = req.body
        // const user = { _id: "66b62fc3777ac9bdcc5050ed" }

        await ProcesoRepository.post_inventarios_registros_fruta_descompuesta(data, user)


        res.send({ status: 200, message: 'Ok' })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

routerProceso2.get("/get_inventarios_registros_fruta_descompuesta", async (req, res) => {
    try {
        //autentificacion
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        console.log(req.body)
        const data = req.body

        const response = await ProcesoRepository.get_inventarios_registros_fruta_descompuesta(data)


        res.send({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

routerProceso2.get("/get_inventarios_numero_registros_fruta_descompuesta", async (req, res) => {
    try {
        //autentificacion
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const response = await ProcesoRepository.get_inventarios_numero_registros_fruta_descompuesta()

        res.send({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

routerProceso2.put("/put_inventarios_registros_fruta_descompuesta", async (req, res) => {
    try {
        //autentificacion
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        console.log(req.body)
        const data = req.body

        const response = await ProcesoRepository.put_inventarios_registros_fruta_descompuesta(data.data)


        res.send({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

routerProceso2.put("/put_proceso_aplicaciones_descarteLavado", async (req, res) => {
    try {

        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const data = {
            data: req.body,
            user: user
        }

        await ProcesoRepository.put_proceso_aplicaciones_descarteLavado(data)

        res.send({ status: 200, message: 'Ok' })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

routerProceso2.put("/put_proceso_aplicaciones_descarteEncerado", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        console.log(token)

        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const data = {
            data: req.body,
            user: user
        }

        await ProcesoRepository.put_proceso_aplicaciones_descarteEncerado(data)

        res.send({ status: 200, message: 'Ok' })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})