import { Either, left, right } from '@sweet-monads/either';
import { ApiDatabaseException, ApiEntityNotFoundException } from 'exceptions';
import { BaseQuery, DatabaseEntity } from 'interfaces';
import { MongoMapper } from 'mappers';
import { Model } from 'mongoose';
import { DatabaseRepository } from 'repositories/database.repository';
import { MongoEntity } from 'schemas';

export abstract class MongoRepositoryImpl<
  Doc extends MongoEntity,
  Entity extends DatabaseEntity = DatabaseEntity,
  Query extends BaseQuery = BaseQuery & Partial<Entity>,
  Create = Omit<Entity, '_id' | 'createdAt' | 'updatedAt'>,
  Update = Partial<Entity>,
  // @ts-ignore
> implements DatabaseRepository<Entity, Query, Create, Update>
{
  protected constructor(
    protected readonly model: Model<Doc>,
    protected readonly mapper: MongoMapper<Entity, Doc, Query>,
  ) {}

  async isExistsById(id: string): Promise<boolean> {
    return this.isExists({ id } as Query);
  }

  async isExists(query: Query): Promise<boolean> {
    const result = await this.model.exists(this.mapper.transformQuery(query));
    return !!result?._id;
  }

  async count(query: Query): Promise<number> {
    return this.model.countDocuments(this.mapper.transformQuery(query));
  }

  async getById(id: string): Promise<Either<ApiEntityNotFoundException, Entity>> {
    return this.getOne({ id } as Query);
  }

  async getOne(query: Query): Promise<Either<ApiEntityNotFoundException, Entity>> {
    const entity: Entity | null = await this.model
      .findOne(this.mapper.transformQuery(query))
      .lean();

    if (!entity) {
      return left(new ApiEntityNotFoundException(this.model.modelName));
    }

    return right(entity);
  }

  async getMany(query: Query): Promise<Entity[]> {
    return this.model.find(this.mapper.transformQuery(query)).lean();
  }

  async saveOne(createData: Create): Promise<Either<ApiDatabaseException, Entity>> {
    try {
      const entity = await this.model.create(createData);
      return right(this.mapper.stringify(entity));
    } catch (e) {
      return left(new ApiDatabaseException(e?.['message']));
    }
  }

  async saveMany(createData: Create[]): Promise<Either<ApiDatabaseException, Entity[]>> {
    try {
      const entities = await this.model.insertMany(createData);
      return right(this.mapper.stringifyMany(entities as any));
    } catch (e) {
      return left(new ApiDatabaseException(e?.['message']));
    }
  }

  async deleteById(id: string): Promise<boolean> {
    return this.deleteOne({ id } as Query);
  }

  async deleteMany(query: Query): Promise<boolean> {
    const result = await this.model.deleteMany(this.mapper.transformQuery(query));
    return !!result.deletedCount;
  }

  async deleteOne(query: Query): Promise<boolean> {
    const result = await this.model.deleteOne(this.mapper.transformQuery(query));
    return !!result.deletedCount;
  }

  async updateById(
    id: string,
    updateData: Update,
  ): Promise<Either<ApiEntityNotFoundException, Entity>> {
    return this.updateOne({ id } as Query, updateData);
  }

  async updateMany(query: Query, updateData: Update): Promise<boolean> {
    const result = await this.model.updateMany(this.mapper.transformQuery(query), {
      $set: updateData,
    });
    return !!result.modifiedCount;
  }

  async updateOne(
    query: Query,
    updateData: Update,
  ): Promise<Either<ApiEntityNotFoundException, Entity>> {
    const entity: Entity | null = await this.model
      .findByIdAndUpdate(this.mapper.transformQuery(query), { $set: updateData }, { new: true })
      .lean();

    if (!entity) {
      return left(new ApiEntityNotFoundException(this.model.modelName));
    }

    return right(entity);
  }
}
