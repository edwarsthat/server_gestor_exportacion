import express from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { routerPythonData } from "../../server/routes/pythonServer.js";
import { routerVariablesdelSistema } from "../../server/mobile/variablesDelSistema.mjs";
import { routerProceso } from "../../server/mobile/process.js";
import { routerProceso2 } from "../../server/routes/https/Proceso.js";
import { routerIndicadores } from "../../server/routes/https/indicadores.js";
import { routerComercial } from "../../server/routes/comercial.js";
import { routerSistema } from "../../server/mobile/sistema.js";

import { routerAPI } from "../../server/routes/api.js";
import { SistemaRepository } from "../../server/api/Sistema.js";
import { UserRepository } from "../../server/auth/users.js";
import { middleWareHandleErrors } from "../middleware/errorHandler.js";
import { formsAPI } from "../../server/routes/public/forms.mjs";
import { routerCalidad } from "../../server/routes/https/Calidad.js";
import { routerDataSys } from "../../server/routes/https/data.js";
import { routerInventarios } from "../../server/routes/https/inventarios.js";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { routerTransporte } from '../../server/routes/https/transporte.js';
import { sp32 } from '../../server/routes/https/sp32.js';
import { routerTalentoHumano } from '../../server/routes/https/talentoHumano.js';
import { routerEvents } from '../../server/routes/https/Events.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const app = express();

// Middleware para bloquear extensiones sospechosas (escaneos automatizados)
const blockSuspiciousExtensions = (req, res, next) => {
    const suspiciousPatterns = [
        /\.php$/i,
        /\.asp$/i,
        /\.aspx$/i,
        /\.jsp$/i,
        /\.env$/i,
        /\.git/i,
        /\.htaccess$/i,
        /\.htpasswd$/i,
        /\.bak$/i,
        /\.sql$/i,
        /\.config$/i,
        /wp-admin/i,
        /wp-content/i,
        /wp-includes/i,
        /phpinfo/i,
        /phpmyadmin/i,
        /admin\.php/i,
        /shell/i,
        /eval-stdin/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(req.url))) {
        console.log(`[BLOQUEADO] Petición sospechosa: ${req.url} - IP: ${req.ip}`);
        return res.status(404).send('Not Found');
    }
    next();
};

// Rate limit para archivos estáticos
const staticLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 50, // 50 peticiones por minuto por IP
    message: 'Demasiadas peticiones. Intenta más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        const isStatic = /\.(html|css|js|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|otf)$/i.test(req.url);
        return !isStatic;
    }
});

// Bloquear peticiones sospechosas primero
app.use(blockSuspiciousExtensions);


// app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
    origin: '*', // En producción, ¡especifica tus dominios permitidos!
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.text());

// Rate limit para archivos estáticos
app.use(staticLimiter);

app.use(express.static(path.join(__dirname, '..', '..', 'public')));

app.use("/transporte", routerTransporte)
app.use("/data", routerPythonData)
app.use("/dataSys", routerDataSys)
app.use("/variablesDeProceso", routerVariablesdelSistema);
app.use("/inventarios", routerInventarios)
app.use("/proceso", routerProceso);
app.use("/proceso2", routerProceso2);
app.use("/indicadores", routerIndicadores);
app.use("/comercial", routerComercial);
app.use("/calidad", routerCalidad)
app.use("/sistema", routerSistema)
app.use("/sp32", sp32)
app.use("/API", routerAPI)
app.use("/forms", formsAPI)
app.use("/talentoHumano", routerTalentoHumano)
app.use("/events", routerEvents)
app.get("/", (_req, res) => {
    res.sendFile(path.join(
        __dirname,
        '..', '..',
        'public',
        'web',
        'index.html'));
});

app.set('trust proxy', 1);

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 15, // máximo 5 peticiones
    message: 'Demasiados intentos de inicio de sesión. Intenta más tarde.',
    standardHeaders: true, // Devuelve los headers RateLimit
    legacyHeaders: false,
});

//se envia el archivo ymal para actualizar la aplicacion de ecritorio
app.get("/latest.yml", async (_req, res, next) => {
    try {

        const fileContents = await SistemaRepository.isNewVersion();

        res.setHeader('Content-Type', 'text/yaml');
        res.send(fileContents);
    }
    catch (err) {
        next(err);
    }
})

app.post("/password", loginLimiter, async (req, res, next) => {
    try {
        const { user } = req.body
        const code = await SistemaRepository.crear_codigo_recuperacion(user)
        res.json({
            status: 200,
            message: 'Ok',
            data: code
        })
    } catch (err) {
        next(err);
    }
});

app.post('/login2', loginLimiter, async (req, res, next) => {
    try {

        const user = { user: req.body.user, password: req.body.password }
        // No registrar credenciales en logs por seguridad

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
        // console.log(err)
        next(err);
    }
});

app.use('/public', express.static(path.join(__dirname, '..', '..', 'public')));

app.use((err, req, res, next) => middleWareHandleErrors(err, req, res, next))

export default app;