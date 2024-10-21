import { status, StatusObject } from '@grpc/grpc-js';
import { HttpStatus } from '@nestjs/common';

export abstract class ApiException extends Error {
  protected constructor(
    public readonly message: string,
    public readonly httpStatus: HttpStatus,
    public readonly grpcStatus: status,
  ) {
    super(message);
  }

  getGrpcResponse(): Omit<StatusObject, 'metadata'> {
    return {
      code: this.grpcStatus,
      details: this.message,
    };
  }

  getHttpResponse() {
    return {
      status: this.httpStatus,
      message: this.message,
    };
  }
}
