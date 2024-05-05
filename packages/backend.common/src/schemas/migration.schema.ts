import { DatabaseCollection } from '@packages/common';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MigrationStatusEnum } from 'enums';
import { MongoEntity } from 'schemas/abstract/mongo.entity';
import { MongooseSchemaType } from 'types';

@Schema({ collection: DatabaseCollection.MIGRATION, timestamps: true })
export class MigrationEntity extends MongoEntity {
  @Prop({ type: MongooseSchemaType.String, required: true, index: true })
  name: string;

  @Prop({ type: MongooseSchemaType.String, enum: MigrationStatusEnum, required: true, index: true })
  status: MigrationStatusEnum;

  @Prop({ type: MongooseSchemaType.String, required: false })
  errorMessage?: string;
}

export const MigrationSchema = SchemaFactory.createForClass(MigrationEntity);
