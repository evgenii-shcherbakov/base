import { status } from '@grpc/grpc-js';
import { ApiException } from './base/api.exception';
import { HttpStatus } from '@nestjs/common';

export class ApiEntityNotFoundException extends ApiException {
  constructor(entityName: string) {
    super(`${entityName} not found`, HttpStatus.NOT_FOUND, status.NOT_FOUND);
  }
}
