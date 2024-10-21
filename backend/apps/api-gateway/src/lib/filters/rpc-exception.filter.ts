import { StatusCodeMapper } from '@backend/common';
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response, Request } from 'express';

@Catch(RpcException)
export class RpcExceptionFilter implements ExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost) {
    const err = exception.getError();
    const ctx = host.switchToHttp();
    const response: Response = ctx.getResponse();
    const request: Request = ctx.getRequest();

    if (typeof err === 'string') {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    const statusCode = StatusCodeMapper.fromGrpcToHttp(err['code']);

    response.status(statusCode).json({
      statusCode,
      message: err['details'],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
