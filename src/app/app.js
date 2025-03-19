const express = require("express");
const { corsMiddle } = require("../middleware/inputHandler");
const path = require('path');
const { routerPythonData } = require("../../server/routes/pythonServer");
const { routerVariablesdelSistema } = require("../../server/mobile/variablesDelSistema");
const { routerProceso } = require("../../server/mobile/process");
const { routerProceso2 } = require("../../server/routes/Proceso");
const { routerIndicadores } = require("../../server/routes/indicadores");
const { routerComercial } = require("../../server/routes/comercial");
const { routerSistema } = require("../../server/mobile/sistema");
const { routerAppTv } = require("../../server/routes/appTv");
const { sp32 } = require("../../server/mobile/sp32");
const { routerAPI } = require("../../server/routes/api");
const { SistemaRepository } = require("../../server/api/Sistema");
const { UserRepository } = require("../../server/auth/users");
const { middleWareHandleErrors } = require("../middleware/errorHandler");
const { formsAPI } = require("../../server/routes/public/forms");
const { routerCalidad } = require("../../server/routes/https/calidad");

const app = express();


app.use((req, res, next) => corsMiddle(req, res, next));
app.use(express.json({ limit: '10mb' }));
app.use(express.text());


app.use(express.static(path.join(__dirname, '..', '..', 'public')));

app.use("/data", routerPythonData)
app.use("/variablesDeProceso", routerVariablesdelSistema);
app.use("/proceso", routerProceso);
app.use("/proceso2", routerProceso2);
app.use("/indicadores", routerIndicadores);
app.use("/comercial", routerComercial);
app.use("/calidad", routerCalidad)
app.use("/sistema", routerSistema)
app.use("/appTV", routerAppTv)
app.use("/sp32", sp32)
app.use("/API", routerAPI)
app.use("/forms", formsAPI)
app.get("/", (req, res) => {
    res.sendFile(path.join(
        __dirname,
        '..', '..',
        'public',
        'web',
        'index.html'));
});

//se envia el archivo ymal para actualizar la aplicacion de ecritorio
app.get("/latest.yml", async (req, res, next) => {
    try {

        const fileContents = await SistemaRepository.isNewVersion();

        res.setHeader('Content-Type', 'text/yaml');
        res.send(fileContents);
    }
    catch (err) {
        next(err);
    }
})
//Envia los archivos para actualizar la aplicacion de escritorio 
app.get('/:filename', async (req, res, next) => {
    try {

        let { filename } = req.params;


        filename = path.basename(filename);
        const file =
            await SistemaRepository.getCelifrutAppFile(filename)


        // Enviar el archivo como respuest
        res.setHeader('Content-Type', 'application/octet-stream');
        res.end(file);

    }
    catch (err) {
        next(err);
    }
})

app.post('/login2', async (req, res, next) => {
    try {
        const user = { user: req.body.user, password: req.body.password }

        const dataUser = await SistemaRepository.login2(user)
        const accesToken = UserRepository.generateAccessToken({
            user: dataUser.usuario,
            cargo: dataUser.cargo._id,
            _id: dataUser._id,
            Rol: dataUser.cargo.Rol
        })
        res.json({
            accesToken: accesToken,
            status: 200,
            message: 'Ok',
            permisos: dataUser.cargo,
            user: dataUser.usuario,
            cargo: dataUser.cargo.Cargo,
            Rol: dataUser.cargo.Rol

        })
    } catch (err) {
        next(err);
    }
});

app.use((err, req, res, next) => middleWareHandleErrors(err, req, res, next))

module.exports = app;