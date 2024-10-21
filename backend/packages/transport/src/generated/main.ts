// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v2.0.3
//   protoc               v5.26.1
// source: main.proto

/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { Observable } from "rxjs";
import { RpcContactList, RpcContactRequest } from "./models/contact";

export const protobufPackage = "main";

export const MAIN_PACKAGE_NAME = "main";

export interface ContactServiceClient {
  getAllPublic(request: RpcContactRequest): Observable<RpcContactList>;
}

export interface ContactServiceController {
  getAllPublic(request: RpcContactRequest): Promise<RpcContactList> | Observable<RpcContactList> | RpcContactList;
}

export function ContactServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = ["getAllPublic"];
    for (const method of grpcMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcMethod("ContactService", method)(constructor.prototype[method], method, descriptor);
    }
    const grpcStreamMethods: string[] = [];
    for (const method of grpcStreamMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcStreamMethod("ContactService", method)(constructor.prototype[method], method, descriptor);
    }
  };
}

export const CONTACT_SERVICE_NAME = "ContactService";
