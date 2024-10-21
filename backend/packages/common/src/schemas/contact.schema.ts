import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MainDatabaseCollection } from '@packages/common';
import { Contact } from 'interfaces';
import { MongoEntity } from 'schemas/abstract/mongo.entity';
import { MongooseSchemaType } from 'types';

@Schema({ collection: MainDatabaseCollection.CONTACT, timestamps: true })
export class ContactEntity extends MongoEntity implements Contact {
  @Prop({ type: MongooseSchemaType.String, required: false })
  link?: string;

  @Prop({ type: MongooseSchemaType.String, required: true, index: true, unique: true })
  name: string;

  // @Prop({
  //   type: MongooseSchemaType.String,
  //   enum: ContactType,
  //   required: true,
  //   index: true,
  // })
  // type: ContactType;

  @Prop({ type: MongooseSchemaType.String, required: true })
  value: string;

  @Prop({ type: MongooseSchemaType.Boolean, required: true, default: false })
  isPublic: boolean;
}

export const ContactSchema = SchemaFactory.createForClass(ContactEntity);
