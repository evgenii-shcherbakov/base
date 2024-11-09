import {
  ApiDatabaseException,
  ApiEntityNotFoundException,
  BaseQuery,
  DatabaseEntity,
} from '@backend/common';
import { Either } from '@sweet-monads/either';

export interface DatabaseRepository<
  Entity extends DatabaseEntity = DatabaseEntity,
  Query extends BaseQuery = BaseQuery & Partial<Entity>,
  Create = Omit<Entity, '_id' | 'createdAt' | 'updatedAt'>,
  Update = Partial<Entity>,
> {
  isExistsById(id: string): Promise<boolean>;
  isExists(query?: Query): Promise<boolean>;
  count(query?: Query): Promise<number>;
  getById(id: string): Promise<Either<ApiEntityNotFoundException, Entity>>;
  getOne(query?: Query): Promise<Either<ApiEntityNotFoundException, Entity>>;
  getMany(query?: Query): Promise<Entity[]>;
  saveOne(createData: Create): Promise<Either<ApiDatabaseException, Entity>>;
  saveMany(createData: Create[]): Promise<Either<ApiDatabaseException, Entity[]>>;
  updateById(id: string, updateData: Update): Promise<Either<ApiEntityNotFoundException, Entity>>;
  updateOne(query: Query, updateData: Update): Promise<Either<ApiEntityNotFoundException, Entity>>;
  updateMany(query: Query, updateData: Update): Promise<boolean>;
  deleteById(id: string): Promise<boolean>;
  deleteOne(query?: Query): Promise<boolean>;
  deleteMany(query?: Query): Promise<boolean>;
}
