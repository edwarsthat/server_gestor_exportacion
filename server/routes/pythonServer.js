const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const routerPythonData = express.Router();

const protoPath = path.resolve(__dirname, '../../../service.proto');

// Cargar el .proto y crear el cliente gRPC
const packageDefinition = protoLoader.loadSync(protoPath, {});
const serviceProto = grpc.loadPackageDefinition(packageDefinition);
const client = new serviceProto.DataService('localhost:50051', grpc.credentials.createInsecure());


routerPythonData.get("/python", async (req, res) => {
    try {
        console.log("📡 Enviando solicitud a Python...");

        client.GetData({}, (error, response) => {
            if (error) {
                console.error("❌ Error en gRPC:", error);
                return res.status(500).json({ status: 500, message: "Error en gRPC" });
            }

            console.log("✅ Datos recibidos de Python:", response);
            res.json({ status: 200, data: response });
        });

        res.send({ status: 200, message: 'Ok' })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

module.exports.routerPythonData = routerPythonData
