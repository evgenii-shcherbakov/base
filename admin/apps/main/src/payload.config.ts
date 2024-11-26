import path from 'path';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { webpackBundler } from '@payloadcms/bundler-webpack';
import { slateEditor } from '@payloadcms/richtext-slate';
import { buildConfig } from 'payload/config';
import { ContactCollection } from './collections/contact.collection';
import { UserCollection } from './collections/user.collection';

const collections = [UserCollection, ContactCollection];

const mongoUrl =
  process.env.MONGODB_URL ??
  'mongodb://localhost:27017,localhost:27018,localhost:27019/main?replicaSet=base';

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
    url: mongoUrl,
  }),
});
