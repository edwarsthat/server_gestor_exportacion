// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var service_pb = require('./service_pb.js');

function serialize_DataResponse(arg) {
  if (!(arg instanceof service_pb.DataResponse)) {
    throw new Error('Expected argument of type DataResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_DataResponse(buffer_arg) {
  return service_pb.DataResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Empty(arg) {
  if (!(arg instanceof service_pb.Empty)) {
    throw new Error('Expected argument of type Empty');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Empty(buffer_arg) {
  return service_pb.Empty.deserializeBinary(new Uint8Array(buffer_arg));
}


var DataServiceService = exports.DataServiceService = {
  getData: {
    path: '/DataService/GetData',
    requestStream: false,
    responseStream: true,
    requestType: service_pb.Empty,
    responseType: service_pb.DataResponse,
    requestSerialize: serialize_Empty,
    requestDeserialize: deserialize_Empty,
    responseSerialize: serialize_DataResponse,
    responseDeserialize: deserialize_DataResponse,
  },
};

exports.DataServiceClient = grpc.makeGenericClientConstructor(DataServiceService, 'DataService');
