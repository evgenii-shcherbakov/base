import { DatabaseCollection } from '@packages/common';
import { CollectionConfig } from 'payload/types';

export const UserCollection: CollectionConfig = {
  slug: DatabaseCollection.USER,
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
};
