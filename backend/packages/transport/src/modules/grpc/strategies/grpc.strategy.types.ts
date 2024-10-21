// import { GrpcClientEnum, GrpcServiceEnum } from 'modules/grpc/grpc.enums';
//
// export type GrpcClientParams = {
//   url?: string;
//   packageName: string;
//   protoPath: string;
//   services: GrpcServiceEnum[];
// };
//
// export type GrpcMappedClientParams = GrpcClientParams & {
//   url: string;
// };
//
// export type GrpcServiceParams = {
//   packageName: string;
//   client: GrpcClientEnum;
//   serviceName: string;
// };
//
// export type GrpcServiceStrategy = {
//   [service in GrpcServiceEnum]: GrpcServiceParams;
// };
//
// export type GrpcClientStrategy = {
//   [microservice in GrpcClientEnum]: GrpcClientParams;
// };
//
// export type GrpcMappedClientStrategy = {
//   [microservice in GrpcClientEnum]: GrpcMappedClientParams;
// };
