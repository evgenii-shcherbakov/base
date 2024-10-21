// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v2.0.3
//   protoc               v5.26.1
// source: main.proto

/* eslint-disable */
import {
  type CallOptions,
  ChannelCredentials,
  Client,
  type ClientOptions,
  type ClientUnaryCall,
  type handleUnaryCall,
  makeGenericClientConstructor,
  Metadata,
  type ServiceError,
  type UntypedServiceImplementation,
} from "@grpc/grpc-js";
import { List, Request } from "./models/contact";

export const protobufPackage = "main";

export type ContactServiceService = typeof ContactServiceService;
export const ContactServiceService = {
  getMany: {
    path: "/main.ContactService/getMany",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: Request) => Buffer.from(Request.encode(value).finish()),
    requestDeserialize: (value: Buffer) => Request.decode(value),
    responseSerialize: (value: List) => Buffer.from(List.encode(value).finish()),
    responseDeserialize: (value: Buffer) => List.decode(value),
  },
} as const;

export interface ContactServiceServer extends UntypedServiceImplementation {
  getMany: handleUnaryCall<Request, List>;
}

export interface ContactServiceClient extends Client {
  getMany(request: Request, callback: (error: ServiceError | null, response: List) => void): ClientUnaryCall;
  getMany(
    request: Request,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: List) => void,
  ): ClientUnaryCall;
  getMany(
    request: Request,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: List) => void,
  ): ClientUnaryCall;
}

export const ContactServiceClient = makeGenericClientConstructor(
  ContactServiceService,
  "main.ContactService",
) as unknown as {
  new (address: string, credentials: ChannelCredentials, options?: Partial<ClientOptions>): ContactServiceClient;
  service: typeof ContactServiceService;
  serviceName: string;
};
