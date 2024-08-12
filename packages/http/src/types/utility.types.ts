export type RequestParam = string | symbol | number | boolean;

export type ClearedUrlOf<Url extends string> = Url extends `${'/' | '//'}${infer Rest}`
  ? ClearedUrlOf<Rest>
  : Url extends `${infer Rest}${'/' | '//'}`
    ? ClearedUrlOf<Rest>
    : Url extends `${infer Prefix}//${infer Suffix}`
      ? `${Prefix}/${Suffix}`
      : Url;

export type SplitString<Str extends string, Delimiter extends string> = string extends Str
  ? string[]
  : Str extends ''
    ? []
    : Str extends `${infer First}${Delimiter}${infer Rest}`
      ? [First, ...SplitString<Rest, Delimiter>]
      : [Str];

export type RouteParamsObject<UrlSegments extends string[]> = UrlSegments extends [
  infer First,
  ...infer Rest,
]
  ? First extends string
    ? Rest extends string[]
      ? First extends `:${infer Segment}`
        ? Segment extends `${infer Param}?`
          ? {
              [K in Param]?: RequestParam;
            } & RouteParamsObject<Rest>
          : {
              [K in Segment]: RequestParam;
            } & RouteParamsObject<Rest>
        : RouteParamsObject<Rest>
      : never
    : never
  : {};

export type RouteParamsOf<Url extends string> = keyof RouteParamsObject<
  SplitString<Url, '/'>
> extends never
  ? undefined
  : RouteParamsObject<SplitString<Url, '/'>>;
