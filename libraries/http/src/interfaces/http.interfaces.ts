import {
  RequestErrorInterceptor,
  RequestInterceptor,
  RequestParams,
  ResponseErrorInterceptor,
  ResponseInterceptor,
} from 'types';

export interface HttpClientInterceptors {
  readonly request: {
    readonly use: (onRequest?: RequestInterceptor, onError?: RequestErrorInterceptor) => void;
  };
  readonly response: {
    readonly use: <Data = any, Result = Data>(
      onResponse?: ResponseInterceptor<Data, Result>,
      onError?: ResponseErrorInterceptor,
    ) => void;
  };
}

export interface HttpClientClass {
  readonly interceptors: HttpClientInterceptors;

  get<Data>(url: string, params?: Omit<RequestParams, 'body'>): Promise<Data>;
  post<Data, Body = Record<string, any>>(url: string, params?: RequestParams<Body>): Promise<Data>;
  patch<Data, Body = Record<string, any>>(url: string, params?: RequestParams<Body>): Promise<Data>;
  put<Data, Body = Record<string, any>>(url: string, params?: RequestParams<Body>): Promise<Data>;
  delete<Data, Body = Record<string, any>>(
    url: string,
    params?: RequestParams<Body>,
  ): Promise<Data>;
}
