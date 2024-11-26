import { TypedHttpAction } from 'enums';
import {
  TypedHttpControllerBaseClass,
  TypedHttpControllerClass,
  TypedHttpControllerEndpoints,
  TypedHttpControllerEndpointsSchema,
} from 'types';

export class TypedHttpController<
  ControllerUrl extends string,
  EndpointsSchema extends TypedHttpControllerEndpointsSchema<any>,
> implements TypedHttpControllerClass<ControllerUrl, EndpointsSchema>
{
  private endpointsSchema: TypedHttpControllerEndpoints<ControllerUrl, EndpointsSchema> = {} as any;

  constructor(private readonly url: ControllerUrl) {}

  get endpoints(): TypedHttpControllerEndpoints<ControllerUrl, EndpointsSchema> {
    return this.endpointsSchema;
  }

  declareEndpoints<EndpointsSchema extends TypedHttpControllerEndpointsSchema<any>>(
    endpointsSchema: EndpointsSchema,
  ): TypedHttpControllerBaseClass<ControllerUrl, EndpointsSchema> {
    for (const endpoint of Object.keys(endpointsSchema)) {
      this.endpointsSchema = {
        ...this.endpointsSchema,
        [endpoint]: endpointsSchema[endpoint][TypedHttpAction.INJECT_URL](this.url),
      };
    }

    return this as any;
  }

  getUrl(): ControllerUrl {
    return this.url;
  }
}
