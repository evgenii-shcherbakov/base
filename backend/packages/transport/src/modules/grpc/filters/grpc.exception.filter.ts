import { getHttpExceptionResponseMessage } from '@backend/common';
import { status } from '@grpc/grpc-js';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import { GrpcStatusCodeMapper } from 'modules/grpc/mappers';

@Catch()
export class GrpcExceptionFilter extends BaseRpcExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    if (exception instanceof RpcException) {
      return super.catch(exception, host);
    }

    if (exception instanceof HttpException) {
      return super.catch(
        new RpcException({
          code: GrpcStatusCodeMapper.fromHttpToGrpc(exception.getStatus()),
          details: getHttpExceptionResponseMessage(exception),
        }),
        host,
      );
    }

    return super.catch(
      new RpcException({ code: status.UNKNOWN, details: exception.message ?? 'Unknown exception' }),
      host,
    );
  }
}
