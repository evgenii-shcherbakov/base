import {
  RequestErrorInterceptor,
  RequestInterceptor,
  RequestParams,
  ResponseErrorInterceptor,
  ResponseInterceptor,
} from 'types';

export class HttpClient {
  private requestInterceptor: RequestInterceptor = (config) => config;
  private responseInterceptor: ResponseInterceptor = (data) => data;

  private requestErrorInterceptor: RequestErrorInterceptor = (error) => {
    throw error;
  };

  private responseErrorInterceptor: ResponseErrorInterceptor = (error) => {
    throw error;
  };

  constructor(private readonly baseUrl = '') {}

  get interceptors() {
    return {
      request: {
        use: (onRequest?: RequestInterceptor, onError?: RequestErrorInterceptor) => {
          if (onRequest) {
            this.requestInterceptor = onRequest;
          }
          if (onError) {
            this.requestErrorInterceptor = onError;
          }
        },
      },
      response: {
        use: <Data = any, Result = Data>(
          onResponse?: ResponseInterceptor<Data, Result>,
          onError?: ResponseErrorInterceptor,
        ) => {
          if (onResponse) {
            this.responseInterceptor = onResponse;
          }
          if (onError) {
            this.responseErrorInterceptor = onError;
          }
        },
      },
    };
  }

  protected clearUrlFromSlashes(input: string): string {
    return input.replace(/^\//g, '').replace(/\/$/g, '');
  }

  protected get headers(): HeadersInit {
    return {};
  }

  protected convertQuery(query: RequestParams['query'] = {}): Record<string, string> {
    return Object.keys(query).reduce((acc: Record<string, string>, key: string) => {
      acc[key] = String(query[key]);
      return acc;
    }, {});
  }

  protected async request<Data = any, Body = Record<string, any>>(
    url: string,
    method: string,
    params: RequestParams<Body> = {},
  ): Promise<Data> {
    const clearedUrl = this.clearUrlFromSlashes(url);
    const fullUrl = this.baseUrl ? `${this.baseUrl}/${clearedUrl}` : clearedUrl;

    const fullUrlWithQuery = params.query
      ? fullUrl + '?' + new URLSearchParams(this.convertQuery(params.query)).toString()
      : fullUrl;

    const initConfig: Omit<RequestInit, 'body'> & { body?: any } = {
      ...params,
      method,
      headers: {
        ...this.headers,
        ...(params.headers ?? {}),
      },
    };

    if (params.body) {
      initConfig.body = JSON.stringify(params.body);
    }

    const requestInit = this.requestInterceptor(initConfig);

    let response: Response;

    try {
      response = await fetch(fullUrlWithQuery, requestInit);
    } catch (error) {
      return this.requestErrorInterceptor(error as Error);
    }

    if (response.status >= 400) {
      let errorMessage: string;

      try {
        const errorBody = await response.json();
        errorMessage = errorBody.message;
      } catch (exception) {
        errorMessage = 'Unknown exception';
      }

      this.responseErrorInterceptor(new Error(errorMessage));
    }

    return this.responseInterceptor(await response.json());
  }

  async get<Data>(url: string, params?: Omit<RequestParams, 'body'>): Promise<Data> {
    return this.request<Data>(url, 'GET', params);
  }

  async post<Data, Body = Record<string, any>>(
    url: string,
    params?: RequestParams<Body>,
  ): Promise<Data> {
    return this.request<Data, Body>(url, 'POST', params);
  }

  async patch<Data, Body = Record<string, any>>(
    url: string,
    params?: RequestParams<Body>,
  ): Promise<Data> {
    return this.request<Data, Body>(url, 'PATCH', params);
  }

  async put<Data, Body = Record<string, any>>(
    url: string,
    params?: RequestParams<Body>,
  ): Promise<Data> {
    return this.request<Data, Body>(url, 'PUT', params);
  }

  async delete<Data, Body = Record<string, any>>(
    url: string,
    params?: RequestParams<Body>,
  ): Promise<Data> {
    return this.request<Data, Body>(url, 'DELETE', params);
  }
}
