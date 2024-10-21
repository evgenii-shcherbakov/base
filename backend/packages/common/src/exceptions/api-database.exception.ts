import { status } from '@grpc/grpc-js';
import { ApiException } from './base/api.exception';
import { HttpStatus } from '@nestjs/common';

export class ApiDatabaseException extends ApiException {
  constructor(message: string) {
    super(`DatabaseException: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR, status.INTERNAL);
  }
}
