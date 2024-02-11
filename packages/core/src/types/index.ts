export type RequestParams<Body = Record<string, any>> = Omit<RequestInit, 'body'> & {
  body?: Body;
  query?: Record<string, string | number | boolean>;
};

export type RequestInterceptor = (config: RequestInit) => RequestInit;
export type ResponseInterceptor<Data = any, Result = Data> = (data: Data) => Result;
export type RequestErrorInterceptor = (error: Error) => never;
export type ResponseErrorInterceptor = (error: Error) => void;
