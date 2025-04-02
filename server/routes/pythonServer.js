const express = require('express');
// const { clientGRPC } = require('../../src/config/conexionGRPC');

const routerPythonData = express.Router();


routerPythonData.get("/python", async (req, res) => {
    try {
        console.log("📡 Enviando solicitud a Python...");

        // clientGRPC.GetData({ input: "hola desde node" }, (error, response) => {
        //     if (error) {
        //         console.error("❌ Error en gRPC:", error);
        //         return res.status(500).json({ status: 500, message: "Error en gRPC" });
        //     }
        //     console.log("✅ Datos recibidos de Python:", response);
        //     return res.json({ status: 200, data: response });
        // });

    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`);
        return res.json({ status: err.status, message: err.message });
    }
});


module.exports.routerPythonData = routerPythonData
