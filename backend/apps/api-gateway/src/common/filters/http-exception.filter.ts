import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response, Request } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response: Response = ctx.getResponse();
    const request: Request = ctx.getRequest();

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'object') {
      const status = exceptionResponse['statusCode'] ?? exception.getStatus();

      const message = Array.isArray(exceptionResponse['message'])
        ? exceptionResponse['message'].join(', ')
        : exceptionResponse['message'] ?? exception.message;

      return response.status(status).json({
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    response.status(exception.getStatus()).json({
      statusCode: exception.getStatus(),
      message: exception.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
