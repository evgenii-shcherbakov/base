import { applyDecorators, Controller, UseFilters, UseInterceptors } from '@nestjs/common';
import { GrpcExceptionFilter } from 'modules/grpc/filters';
import { GrpcControllerInterceptor } from 'modules/grpc/interceptors';

export const GrpcController = (): ClassDecorator => {
  return applyDecorators(
    Controller(),
    UseInterceptors(GrpcControllerInterceptor),
    UseFilters(GrpcExceptionFilter),
  );
};
