// const grpc = require('@grpc/grpc-js');
// const protoLoader = require('@grpc/proto-loader');
// const path = require('path');

// const protoPath = path.resolve(__dirname, '../../../service.proto');

// // Cargar el .proto y crear el cliente gRPC
// const packageDefinition = protoLoader.loadSync(protoPath, {});
// const serviceProto = grpc.loadPackageDefinition(packageDefinition);
// const clientGRPC = new serviceProto.DataService('localhost:50051', grpc.credentials.createInsecure());

// module.exports = {
//     clientGRPC
// }