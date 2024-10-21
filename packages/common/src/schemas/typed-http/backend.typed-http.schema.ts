// import { HttpMethodEnum } from 'features/http';
// import { SchemaEndpointDefinition } from 'features/rest-api';
// import {
//   BackendContact,
//   BackendCv,
//   BackendExperience,
//   BackendIdentity,
//   BackendJob,
//   BackendProject,
// } from 'models';
//
// export type BackendRestApiSchema = {
//   identity: {
//     [HttpMethodEnum.GET]: SchemaEndpointDefinition<never, BackendIdentity>;
//     contacts: {
//       [HttpMethodEnum.GET]: SchemaEndpointDefinition<never, BackendContact[]>;
//     };
//     experience: {
//       [HttpMethodEnum.GET]: SchemaEndpointDefinition<never, BackendExperience[]>;
//     };
//     jobs: {
//       [HttpMethodEnum.GET]: SchemaEndpointDefinition<never, BackendJob[]>;
//     };
//     projects: {
//       [HttpMethodEnum.GET]: SchemaEndpointDefinition<never, BackendProject[]>;
//     };
//   };
//   cv: {
//     [HttpMethodEnum.GET]: SchemaEndpointDefinition<never, BackendCv>;
//     ':alias': {
//       [HttpMethodEnum.GET]: SchemaEndpointDefinition<never, BackendCv>;
//     };
//   };
// };

import { TypedHttpClient, TypedHttpController, TypedHttpEndpoint } from '@evgenii-shcherbakov/http';
import {
  // BackendContact,
  // BackendCv,
  // BackendExperience,
  // BackendIdentity,
  // BackendJob,
  // BackendProject,
  MainContact,
  // MainExperience,
  // MainJob,
  // MainProject,
} from 'models';

export const BackendTypedHttpSchema = {
  main: new TypedHttpController('main').declareEndpoints({
    getContacts: TypedHttpEndpoint.get('contacts').response<MainContact[]>(),
  }),
  // public: new TypedHttpController('public').declareEndpoints({
  //   // getIdentity: TypedHttpEndpoint.get('identity/current').response<BackendIdentity>(),
  //   getContacts: TypedHttpEndpoint.get('contacts').response<MainContact[]>(),
  //   getExperience: TypedHttpEndpoint.get('experience').response<MainExperience[]>(),
  //   getJobs: TypedHttpEndpoint.get('jobs').response<MainJob[]>(),
  //   getProjects: TypedHttpEndpoint.get('projects').response<MainProject[]>(),
  // }),
  // cv: new TypedHttpController('cv').declareEndpoints({
  //   // getPrimary: TypedHttpEndpoint.get('').response<BackendCv>(),
  //   getByAlias: TypedHttpEndpoint.get(':alias').response<BackendCv>(),
  // }),
} as const;

// const backendClient = new TypedHttpClient(BackendTypedHttpSchema, '');
//
// const result = await backendClient.typed.public.getContacts({});
//
// const cv = await backendClient.typed.cv.getPrimary({});
// const cv2 = await backendClient.typed.cv.getByAlias({ params: { alias: 'backend' } });
//
// const url = BackendTypedHttpSchema.cv.endpoints.getPrimary.getUrl();
