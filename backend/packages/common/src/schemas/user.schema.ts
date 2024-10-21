import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { MainDatabaseCollection } from '@packages/common';
import { User } from 'interfaces';
import { MongoEntity } from 'schemas/abstract/mongo.entity';

@Schema({ collection: MainDatabaseCollection.USER, timestamps: true })
export class UserEntity extends MongoEntity implements User {}

export const UserSchema = SchemaFactory.createForClass(UserEntity);
