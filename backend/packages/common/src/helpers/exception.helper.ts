import { HttpException } from '@nestjs/common';
import _ from 'lodash';

export const getHttpExceptionResponseMessage = (exception: HttpException): string => {
  const response = exception.getResponse();

  if (_.isString(response)) {
    return response;
  }

  const message = response['message'];

  if (_.isArray(message)) {
    return message.join(', ');
  }

  return message ?? exception.message;
};
