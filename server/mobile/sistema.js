const express = require('express');
const yaml = require("js-yaml");
const { SistemaRepository } = require('../api/Sistema');
const { UserRepository } = require('../auth/users');
const routerSistema = express.Router();

routerSistema.get("/", (req, res) => {
    res.send("Sistema")
});

routerSistema.get("/check_mobile_version", async (req, res) => {
    try {
        console.log("check update")
        const version = await SistemaRepository.check_mobile_version();
        console.log(version)
        res.send({ status: 200, message: 'Ok', data: version })
    }
    catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})
routerSistema.get("/download_mobilApp/:name", async (req, res) => {
    try {
        const apk = await SistemaRepository.download_mobilApp(req.params.name);
        res.sendFile(apk, (err) => {
            if (err) {
                if (!res.headersSent) {
                    res.status(500).json({ status: 500, message: 'Error sending file' });
                }
            }
        });
    }
    catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        if (!res.headersSent) {
            res.status(err.status || 500).json({ status: err.status || 500, message: err.message });
        }
    }
})

routerSistema.get("/check_desktopApp/:name", async (req, res) => {
    try {
        let out;
        const fileContents = await SistemaRepository.isNewVersion();
        const latest = yaml.load(fileContents);
        if (req.params.name === latest.version) {
            out = "false";
        } else {
            out = "true";
        }
        res.send(out)
    }
    catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

routerSistema.get("/obtener_operarios_higiene", async (req, res) => {
    try {
        const token = req.headers['authorization'];

        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, 'obtener_operarios_higiene')

        const data = req.body

        const operarios = await SistemaRepository.obtener_operarios_higiene(data, user.user)


        res.send({ status: 200, message: 'Ok', data: operarios })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

routerSistema.post("/add_higiene_personal", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, "add_higiene_personal")

        const data = req.body

        await SistemaRepository.add_higiene_personal(data, user)

        res.json({ status: 200, message: 'Ok' })

    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})

module.exports = { routerSistema };
