import { TypedHttpClient } from 'clients';
import { TypedHttpController, TypedHttpEndpoint } from 'entities';
import { TypedHttpAction } from 'enums';
import { ClearedUrlOf, RouteParamsOf } from 'types';

// Result type should be 'users/:userId/comments'

type ClearedUrl1 = ClearedUrlOf<'users/:userId/comments'>;
type ClearedUrl2 = ClearedUrlOf<'/users/:userId/comments/'>;
type ClearedUrl3 = ClearedUrlOf<'/users/:userId//comments/'>;
type ClearedUrl4 = ClearedUrlOf<'//users/:userId//comments//'>;

// Result type should be undefined

type RouteParams1 = RouteParamsOf<'users'>;

const routeParams1: RouteParams1 = undefined;

// Result type should be { userId: RequestParam }

type RouteParams2 = RouteParamsOf<'users/:userId'>;

const routeParams2: RouteParams2 = {
  userId: 1,
};

// Result type should be { userId?: RequestParam }

type RouteParams3 = RouteParamsOf<'users/:userId?'>;

const routeParams3: RouteParams3 = {};

// Result type should be { userId: RequestParam; commentId: RequestParam }

type RouteParams4 = RouteParamsOf<'users/:userId/comments/:commentId'>;

const routeParams4: RouteParams4 = {
  userId: 1,
  commentId: 1,
};

// Result type should be { userId: RequestParam; commentId?: RequestParam }

type RouteParams5 = RouteParamsOf<'users/:userId/comments/:commentId?'>;

const routeParams5: RouteParams5 = {
  userId: 1,
};

//
// const schema = {
//   auth: new TypedHttpController('auth').declareEndpoints({
//     refresh: TypedHttpEndpoint.post('refresh').request<boolean>().response<bigint>(),
//     createComment: TypedHttpEndpoint.post('users/:userId/comment')
//       .request<boolean>()
//       .response<bigint>(),
//   }),
// };
//
// const client = new TypedHttpClient(schema, '');
//
// const result = schema.auth.endpoints.refresh.getUrl();
// const result2 = schema.auth.endpoints.createComment.getUrl();
//
// const result3 = schema.auth.getUrl();
// // const result4 = schema.auth.endpoints.postAuthRefresh;
//
// const response = await client.typed.auth.refresh({ body: true });
// const response2 = await client.typed.auth.createComment({
//   params: { userId: 1 },
//   body: true,
// });
//
// client.typed.auth.refresh({ body: {} });
