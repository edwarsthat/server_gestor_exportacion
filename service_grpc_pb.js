// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var service_pb = require('./service_pb.js');

function serialize_DataRequest(arg) {
  if (!(arg instanceof service_pb.DataRequest)) {
    throw new Error('Expected argument of type DataRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_DataRequest(buffer_arg) {
  return service_pb.DataRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_DataResponse(arg) {
  if (!(arg instanceof service_pb.DataResponse)) {
    throw new Error('Expected argument of type DataResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_DataResponse(buffer_arg) {
  return service_pb.DataResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var DataServiceService = exports.DataServiceService = {
  getData: {
    path: '/DataService/GetData',
    requestStream: false,
    responseStream: false,
    requestType: service_pb.DataRequest,
    responseType: service_pb.DataResponse,
    requestSerialize: serialize_DataRequest,
    requestDeserialize: deserialize_DataRequest,
    responseSerialize: serialize_DataResponse,
    responseDeserialize: deserialize_DataResponse,
  },
};

exports.DataServiceClient = grpc.makeGenericClientConstructor(DataServiceService, 'DataService');
