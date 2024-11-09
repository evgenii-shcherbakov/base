import { MongoMainCollection } from '@packages/common';
import { CollectionConfig } from 'payload/types';

export const ContactCollection: CollectionConfig = {
  slug: MongoMainCollection.CONTACT,
  admin: {
    useAsTitle: 'name',
    listSearchableFields: ['name', 'value', 'type'],
  },
  fields: [
    {
      type: 'text',
      name: 'name',
      unique: true,
      required: true,
    },
    {
      type: 'text',
      name: 'value',
      required: true,
    },
    {
      type: 'text',
      name: 'link',
      required: false,
    },
    {
      type: 'checkbox',
      name: 'isPublic',
      required: true,
      defaultValue: true,
    },
  ],
};
