import { BaseQuery, DatabaseEntity } from 'interfaces';
import { FilterQuery } from 'mongoose';
import { MongoEntity } from 'schemas';

export class MongoMapper<
  Entity extends DatabaseEntity,
  Doc extends MongoEntity,
  Query extends BaseQuery = BaseQuery & Partial<Entity>,
> {
  transformQuery({ id, ids, ...rest }: Query): FilterQuery<Doc> {
    const result: FilterQuery<any> = { ...rest };

    if (id) {
      result._id = id;
    }

    if (ids?.length) {
      result._id = {
        $in: ids,
      };
    }

    return result;
  }

  stringify(entity: Doc): Entity {
    return entity.toJSON({ flattenMaps: false });
  }

  stringifyMany(entities: Doc[]): Entity[] {
    return entities.map((entity) => this.stringify(entity));
  }
}
