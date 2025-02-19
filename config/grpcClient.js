const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const protoPath = path.resolve(__dirname, '../../service.proto');

const packageDefinition = protoLoader.loadSync(protoPath, {})
const serviceProto = grpc.loadPackageDefinition(packageDefinition)

const client = new serviceProto.DataService('localhost:50051', grpc.credentials.createInsecure());

// 📌 Variable global para almacenar los datos en tiempo real
let latestData = [];

// ✅ **Función que mantiene la conexión con Python siempre activa**
function startGrpcStream() {
    console.log("🔗 Iniciando conexión gRPC con Python...");

    const call = client.StreamData({});

    call.on('data', (data) => {
        console.log(`📊 Nuevo dato recibido: ${data.value} | Timestamp: ${data.timestamp}`);

        // Mantiene los últimos 100 datos (ajústalo según necesidad)
        latestData.push({
            value: data.value,
            timestamp: data.timestamp
        });

        if (latestData.length > 100) {
            latestData.shift(); // Elimina los datos más antiguos
        }
    });

    call.on('error', (err) => {
        console.error("❌ Error en la conexión gRPC:", err);
        console.log("🔄 Reintentando conexión en 5 segundos...");
        setTimeout(startGrpcStream, 5000); // Reintenta después de 5s
    });

    call.on('end', () => {
        console.log("✅ Stream finalizado. Reiniciando conexión...");
        setTimeout(startGrpcStream, 2000); // Espera 2s y vuelve a conectar
    });
}

module.exports = {
    startGrpcStream
}