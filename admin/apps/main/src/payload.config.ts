import path from 'path';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { webpackBundler } from '@payloadcms/bundler-webpack';
import { slateEditor } from '@payloadcms/richtext-slate';
import { buildConfig } from 'payload/config';
import { ContactCollection } from './collections/contact.collection';
import { UserCollection } from './collections/user.collection';

const collections = [UserCollection, ContactCollection];

export default buildConfig({
  admin: {
    user: UserCollection.slug,
    bundler: webpackBundler(),
  },
  editor: slateEditor({}),
  collections,
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL,
  }),
});
