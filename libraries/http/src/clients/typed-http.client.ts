import { HttpClient } from 'clients/http.client';
import { TypedHttpAction } from 'enums';
import {
  HttpMethodType,
  RequestParams,
  TypedHttpClientClass,
  TypedHttpClientSchema,
  TypedHttpClientSchemaMethods,
  TypedHttpEndpointSchema,
  TypedHttpMethod,
  TypedRequestParamsOf,
} from 'types';

export class TypedHttpClient<ClientSchema extends TypedHttpClientSchema>
  extends HttpClient
  implements TypedHttpClientClass<ClientSchema>
{
  public readonly typed: TypedHttpClientSchemaMethods<ClientSchema>;

  constructor(
    private readonly clientSchema: ClientSchema,
    baseUrl: string,
  ) {
    super(baseUrl);
    this.typed = this.generateTypedMethods(this.clientSchema);
  }

  private generateTypedMethods(schema: ClientSchema): TypedHttpClientSchemaMethods<ClientSchema> {
    return Object.keys(schema).reduce(
      (acc: TypedHttpClientSchemaMethods<ClientSchema>, controller) => {
        const endpoints = Object.keys(schema[controller].endpoints).reduce(
          (controllerEndpoints, endpoint) => {
            const endpointSchema: TypedHttpEndpointSchema<any, any, any, any> =
              schema[controller].endpoints[endpoint][TypedHttpAction.SCHEMA];

            return {
              ...controllerEndpoints,
              [endpoint]: this.typedRequestFactory(endpointSchema.fullUrl, endpointSchema.method),
            };
          },
          {} as any,
        );

        return {
          ...acc,
          [controller]: endpoints,
        };
      },
      {} as any,
    );
  }

  protected typedRequestFactory<
    EndpointSchema extends TypedHttpEndpointSchema<any, any, any, any>,
    Params extends TypedRequestParamsOf<
      EndpointSchema['fullUrl'],
      EndpointSchema['method'],
      EndpointSchema['request']
    >,
    Response extends EndpointSchema['response'],
  >(fullUrl: string, method: HttpMethodType): TypedHttpMethod<EndpointSchema, Params, Response> {
    return async (params: Params): Promise<Response> => {
      const url = fullUrl
        .split('/')
        .map((part) => {
          if (/:\w+/g.test(part)) {
            return (
              // @ts-ignore
              (params['params'] as unknown as Record<string, string>)?.[part.replace(/^:/g, '')] ??
              'undefined'
            );
          }

          return part;
        })
        .join('/');

      const requestParams: RequestParams = {
        headers: params.headers,
        query: params.query,
      };

      //@ts-ignore
      if (method !== 'get' && params['body']) {
        //@ts-ignore
        requestParams.body = params['body'];
      }

      //@ts-ignore
      return super[method](url, requestParams);
    };
  }
}
