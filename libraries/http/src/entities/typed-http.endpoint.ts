import { HttpMethod, TypedHttpAction } from 'enums';
import {
  ClearedUrlOf,
  HttpMethodType,
  TypedHttpEndpointClass,
  TypedHttpEndpointSchema,
} from 'types';

export class TypedHttpEndpoint<
  ControllerUrl extends string,
  Url extends string,
  Method extends HttpMethodType,
  Request = undefined,
  Response = undefined,
> implements TypedHttpEndpointClass<ControllerUrl, Url, Method, Request, Response>
{
  private fullUrl: string = '';

  constructor(
    public readonly url: Url,
    private readonly method: Method,
  ) {}

  request<Request>(): Omit<
    TypedHttpEndpointClass<ControllerUrl, Url, Method, Request, Response>,
    'request'
  > {
    return this as any;
  }

  response<Response>(): Omit<
    TypedHttpEndpointClass<ControllerUrl, Url, Method, Request, Response>,
    'response'
  > {
    return this as any;
  }

  get [TypedHttpAction.SCHEMA](): TypedHttpEndpointSchema<
    ClearedUrlOf<`${ControllerUrl}/${Url}`>,
    Method,
    Request,
    Response
  > {
    return {
      fullUrl: this.fullUrl,
      method: this.method,
    } as any;
  }

  [TypedHttpAction.INJECT_URL](
    url: string,
  ): TypedHttpEndpointClass<ControllerUrl, Url, Method, Request, Response> {
    this.fullUrl = `${url}/${this.url}`.replace(/(^\/|\/$)/gi, '').replace(/\/\//g, '/');
    return this;
  }

  getUrl(): Url {
    return this.url;
  }

  static get<ControllerUrl extends string, Url extends string>(
    url: Url,
  ): TypedHttpEndpointClass<ControllerUrl, Url, 'get'> {
    return new this(url, HttpMethod.GET);
  }

  static post<ControllerUrl extends string, Url extends string>(
    url: Url,
  ): TypedHttpEndpointClass<ControllerUrl, Url, 'post'> {
    return new this(url, HttpMethod.POST);
  }

  static patch<ControllerUrl extends string, Url extends string>(
    url: Url,
  ): TypedHttpEndpointClass<ControllerUrl, Url, 'patch'> {
    return new this(url, HttpMethod.PATCH);
  }

  static put<ControllerUrl extends string, Url extends string>(
    url: Url,
  ): TypedHttpEndpointClass<ControllerUrl, Url, 'put'> {
    return new this(url, HttpMethod.PUT);
  }

  static delete<ControllerUrl extends string, Url extends string>(
    url: Url,
  ): TypedHttpEndpointClass<ControllerUrl, Url, 'delete'> {
    return new this(url, HttpMethod.DELETE);
  }
}
