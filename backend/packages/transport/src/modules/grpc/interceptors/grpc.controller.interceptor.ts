import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import _ from 'lodash';
import { map, Observable } from 'rxjs';
import { isObjectIdOrHexString } from 'mongoose';

@Injectable()
export class GrpcControllerInterceptor implements NestInterceptor {
  private convertValue(value: any) {
    if (!value) {
      return value;
    }

    if (_.isDate(value)) {
      return {
        seconds: value.getTime() / 1000,
        nanos: (value.getTime() % 1000) * 1e6,
      };
    }

    if (isObjectIdOrHexString(value)) {
      return value.toString();
    }

    if (_.isArray(value)) {
      return _.map(value, (item) => this.convertValue(item));
    }

    if (_.isObject(value)) {
      for (const field of _.keys(value)) {
        value[field] = this.convertValue(value[field]);
      }

      return value;
    }

    return value;
  }

  intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(this.convertValue.bind(this)));
  }
}
