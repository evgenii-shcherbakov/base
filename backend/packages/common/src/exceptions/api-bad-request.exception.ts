import { status } from '@grpc/grpc-js';
import { ApiException } from './base/api.exception';
import { HttpStatus } from '@nestjs/common';

export class ApiBadRequestException extends ApiException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST, status.INVALID_ARGUMENT);
  }
}
