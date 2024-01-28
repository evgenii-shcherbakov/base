import { resolve, relative } from 'path';

import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { webpackBundler } from '@payloadcms/bundler-webpack';
import { slateEditor } from '@payloadcms/richtext-slate';
import { buildConfig } from 'payload/config';
import { DATABASE_URL } from '@admin/constants/environment';
import pathsConfig from '../../../tsconfig.paths.json';
import { UserCollection } from '@admin/payload/collections/core/user/user.collection';
import { CORE_COLLECTIONS } from '@admin/payload/collections/core';

type TSPathsObject = Record<string, string[]>;

const payloadConfig = buildConfig({
  admin: {
    user: UserCollection.slug,
    bundler: webpackBundler(),
    webpack: (config) => {
      const aliasObject: TSPathsObject = pathsConfig.compilerOptions.paths;

      config.resolve = {
        ...(config.resolve ?? {}),
        alias: {
          ...(config.resolve?.alias ?? {}),
          ...Object.keys(aliasObject).reduce((acc: TSPathsObject, alias: string) => {
            acc[alias] = aliasObject[alias].map((path: string) => {
              return relative('src/payload/configs', path);
            });
            return acc;
          }, {}),
        },
      };

      return config;
    },
  },
  editor: slateEditor({}),
  collections: [...CORE_COLLECTIONS],
  typescript: {
    outputFile: resolve(__dirname, '../types/payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: resolve(__dirname, '../graphql/generated-schema.graphql'),
  },
  db: mongooseAdapter({
    url: DATABASE_URL,
  }),
});

export default payloadConfig;
