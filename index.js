require('dotenv').config();
const express = require("express");
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const cron = require("node-cron");
const path = require('path')

const { connectPostgresDB } = require('./DB/postgresDB/init')
const { initMongoDB } = require('./DB/mongoDB/config/init');
const { apiSocket } = require('./server/desktop/reduce');
const { UserRepository } = require('./server/auth/users');
const { BadGetwayError } = require('./Error/ConnectionErrors');
const { socketMobileRepository } = require('./server/mobile/socket');
const { routerSistema } = require('./server/mobile/sistema');
const { routerVariablesdelSistema } = require('./server/mobile/variablesDelSistema');
const { routerProceso } = require('./server/mobile/process');
const { routerCalidad } = require('./server/mobile/calidad');
const { routerComercial } = require('./server/mobile/comercial');
const { routerAppTv } = require('./server/routes/appTv');
const { ProcesoRepository } = require('./server/api/Proceso');
const { SistemaRepository } = require('./server/api/Sistema');
const { AccessError } = require('./Error/ValidationErrors');

initMongoDB()
const client = connectPostgresDB()

//#region HTTP
// Middleware para configurar CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Permite solicitudes de cualquier origen
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Métodos permitidos
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization'); // Encabezados permitidos
    // Maneja las solicitudes OPTIONS (pre-flight)
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json({ limit: '10mb' }));
// Aumentar el límite de tamaño del cuerpo de la solicitud de manera global


app.use(express.static(path.join(__dirname, 'public')));
app.use("/variablesDeProceso", routerVariablesdelSistema);
app.use("/proceso", routerProceso);
app.use("/comercial", routerComercial);
app.use("/calidad", routerCalidad)
app.use("/sistema", routerSistema)
app.use("/appTV", routerAppTv)
app.get("/", (req, res) => {
    res.send('Hello from the root route!');
});

app.post('/login', async (req, res) => {
    const user = { user: req.body.user, password: req.body.password }
    try {
        const dataUser = await UserRepository.login(user, client)
        const accesToken = UserRepository.generateAccessToken({
            user: dataUser.usuario,
            cargo: dataUser.cargo
        })
        res.json({
            accesToken: accesToken,
            status: 200,
            message: 'Ok',
            permisos: dataUser.permisos
        })
    } catch (err) {
        res.json(err)

    }
});

app.post('/login2', async (req, res) => {
    const user = { user: req.body.user, password: req.body.password }
    try {
        const dataUser = await SistemaRepository.login2(user)
        const accesToken = UserRepository.generateAccessToken({
            user: dataUser.usuario,
            cargo: dataUser.cargo._id
        })
        res.json({
            accesToken: accesToken,
            status: 200,
            message: 'Ok',
            permisos: dataUser.cargo,
            user: dataUser.usuario,
            cargo: dataUser.cargo.Cargo
        })
    } catch (err) {
        res.json(err)

    }
});

app.listen(process.env.PORT, process.env.HOST, () => {
    console.log(`El servidor está escuchando en el puerto ${process.env.PORT} y la dirección IP ${process.env.HOST}.`);
});


//#region  Socket

// Middleware de autenticación para Socket.IO
io.use((socket, next) => {
    UserRepository.authenticateTokenSocket(socket, next)
});

async function sendData(data) {
    io.emit('servidor', data)
};

io.on("connection", socket => {
    console.log("an user has connected");
    let ongoingRequests = {};
    socket.on("Desktop2", async (data, callback) => {
        try {
            // If the request is already ongoing, return
            if (ongoingRequests[data.data.action]) {
                return;
            }
            const user = await UserRepository.authenticateToken(data.token)

            data = { ...data, user: user }

            // Mark the request as ongoing
            ongoingRequests[data.data.action] = true;

            const autorizado = await UserRepository.autentificacionPermisos(data.user.cargo, data.data.action, data.user.user);
            const autorizado2 = await UserRepository.autentificacionPermisos2(data);

            if (!(autorizado || autorizado2)) {
                throw new AccessError(412, `Acceso no autorizado ${data.data.action}`);
            }

            if (!Object.prototype.hasOwnProperty.call(apiSocket, data.data.action))
                throw new BadGetwayError(501, `Error badGetWay ${data.data.action} no existe`)
            const response = await apiSocket[data.data.action](data, sendData);
            const newToken = await UserRepository.generateAccessToken({
                user: data.user.user,
                cargo: data.user.cargo
            })
            callback({ ...response, token: newToken })
        } catch (err) {
            console.log("Error socket: ", err);
            if (![401, 402, 403, 404, 405].includes(err.status)) {
                const newToken = data.user ? UserRepository.generateAccessToken({
                    user: data.user.user,
                    cargo: data.user.cargo
                }) : null;
                callback({ ...err, token: newToken });
            } else {
                callback(err);
            }
        } finally {
            console.log(ongoingRequests)
            if (data && data.data && data.data.action) {
                delete ongoingRequests[data.data.action]
            }
        }
    })
    socket.on("Mobile", async (data, callback) => {
        try {
            // If the request is already ongoing, return
            if (ongoingRequests[data.data.action]) {
                return;
            }

            const user = await UserRepository.authenticateToken(data.token)
            data = { ...data, user: user }

            // Mark the request as ongoing
            ongoingRequests[data.data.action] = true;
            await UserRepository.autentificacionPermisos(data.user.cargo, data.data.action);

            if (!Object.prototype.hasOwnProperty.call(socketMobileRepository, data.data.action))
                throw new BadGetwayError(501, `Error badGetWay ${data.data.action} no existe`)
            const response = await socketMobileRepository[data.data.action](data);

            callback(response)
        } catch (err) {
            console.log("Error socket: ", err);
            if (![401, 402, 403, 404, 405].includes(err.status)) {
                const newToken = data.user ? await UserRepository.generateAccessToken({
                    user: data.user.user,
                    cargo: data.user.cargo
                }) : null;
                callback({ ...err, token: newToken });
            } else {
                callback(err);
            }
        } finally {
            delete ongoingRequests[data.data.action]
        }
    })
});

server.listen(3011, () => {
    console.log('listening on *:3011');
});

// #region Acciones programadas

//reiniciar valores del sistema
cron.schedule("55 4 * * *", async () => {
    await ProcesoRepository.reiniciarValores_proceso()
});

