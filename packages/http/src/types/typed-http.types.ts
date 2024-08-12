import { TypedHttpAction } from 'enums';
import { HttpClientClass } from 'interfaces';
import { RequestQuery } from 'types/http.types';
import { ClearedUrlOf, RouteParamsOf } from 'types/utility.types';

export type HttpMethodType = 'get' | 'post' | 'patch' | 'put' | 'delete';

export type TypedHttpEndpointSchema<
  FullUrl extends string,
  Method extends HttpMethodType,
  Request,
  Response,
> = {
  fullUrl: FullUrl;
  method: Method;
  request: Request;
  response: Response;
};

export type TypedHttpClientSchema = {
  [key: string]: TypedHttpControllerBaseClass<any, any>;
};

export interface TypedHttpEndpointBaseClass<
  ControllerUrl extends string,
  Url extends string,
  Method extends HttpMethodType,
  Request = undefined,
  Response = undefined,
> {
  readonly [TypedHttpAction.SCHEMA]: TypedHttpEndpointSchema<
    ClearedUrlOf<`${ControllerUrl}/${Url}`>,
    Method,
    Request,
    Response
  >;

  [TypedHttpAction.INJECT_URL](
    url: string,
  ): TypedHttpEndpointClass<ControllerUrl, Url, Method, Request, Response>;

  getUrl(): Url;
}

export interface TypedHttpEndpointClass<
  ControllerUrl extends string,
  Url extends string,
  Method extends HttpMethodType,
  Request = undefined,
  Response = undefined,
> extends TypedHttpEndpointBaseClass<ControllerUrl, Url, Method, Request, Response> {
  request<Request>(): Omit<
    TypedHttpEndpointClass<ControllerUrl, Url, Method, Request, Response>,
    'request'
  >;

  response<Response>(): Omit<
    TypedHttpEndpointClass<ControllerUrl, Url, Method, Request, Response>,
    'response'
  >;
}

export type TypedHttpControllerEndpointsSchema<ControllerUrl extends string> = {
  [key: string]: TypedHttpEndpointBaseClass<ControllerUrl, any, any, any, any>;
};

export type TypedHttpControllerEndpoints<
  ControllerUrl extends string,
  EndpointsSchema extends TypedHttpControllerEndpointsSchema<ControllerUrl>,
> = {
  [Endpoint in keyof EndpointsSchema]: EndpointsSchema[Endpoint] extends TypedHttpEndpointBaseClass<
    any,
    any,
    any,
    any,
    any
  >
    ? EndpointsSchema[Endpoint]
    : never;
};

export type TypedRequestBody<Method extends HttpMethodType, Request> = Method extends 'get'
  ? {}
  : Request extends undefined
    ? {}
    : {
        body: Request;
      };

export type TypedRequestParam<FullUrl extends string> =
  RouteParamsOf<FullUrl> extends undefined
    ? {}
    : {
        params: RouteParamsOf<FullUrl>;
      };

export type TypedRequestParamsOf<
  FullUrl extends string,
  Method extends HttpMethodType,
  Request,
> = TypedRequestBody<Method, Request> &
  TypedRequestParam<FullUrl> & {
    query?: RequestQuery;
    headers?: HeadersInit;
  };

export type TypedHttpMethod<
  EndpointSchema extends TypedHttpEndpointSchema<any, any, any, any>,
  Params extends TypedRequestParamsOf<
    EndpointSchema['fullUrl'],
    EndpointSchema['method'],
    EndpointSchema['request']
  >,
  Response extends EndpointSchema['response'],
> = (params: Params) => Promise<Response>;

export type TypedHttpClientSchemaMethods<ClientSchema extends TypedHttpClientSchema> = {
  [Controller in keyof ClientSchema]: {
    [Endpoint in keyof ClientSchema[Controller]['endpoints']]: TypedHttpMethod<
      ClientSchema[Controller]['endpoints'][Endpoint][TypedHttpAction.SCHEMA],
      TypedRequestParamsOf<
        ClientSchema[Controller]['endpoints'][Endpoint][TypedHttpAction.SCHEMA]['fullUrl'],
        ClientSchema[Controller]['endpoints'][Endpoint][TypedHttpAction.SCHEMA]['method'],
        ClientSchema[Controller]['endpoints'][Endpoint][TypedHttpAction.SCHEMA]['request']
      >,
      ClientSchema[Controller]['endpoints'][Endpoint][TypedHttpAction.SCHEMA]['response']
    >;
  };
};

export interface TypedHttpControllerBaseClass<
  ControllerUrl extends string,
  EndpointsSchema extends TypedHttpControllerEndpointsSchema<ControllerUrl>,
> {
  readonly endpoints: TypedHttpControllerEndpoints<ControllerUrl, EndpointsSchema>;

  getUrl(): ControllerUrl;
}

export interface TypedHttpControllerClass<
  ControllerUrl extends string,
  EndpointsSchema extends TypedHttpControllerEndpointsSchema<ControllerUrl>,
> extends TypedHttpControllerBaseClass<ControllerUrl, EndpointsSchema> {
  declareEndpoints<EndpointsSchema extends TypedHttpControllerEndpointsSchema<any>>(
    endpointsSchema: EndpointsSchema,
  ): TypedHttpControllerBaseClass<ControllerUrl, EndpointsSchema>;
}

export interface TypedHttpClientClass<ClientSchema extends TypedHttpClientSchema>
  extends HttpClientClass {
  readonly typed: TypedHttpClientSchemaMethods<ClientSchema>;
}

// export interface TypedHttpControllerInterface<
//   ControllerUrl extends string,
//   EndpointsSchema extends TypedHttpControllerEndpointsSchema<ControllerUrl>,
// > {
//   [Method in keyof EndpointsSchema](): Promise<void>;
// }
