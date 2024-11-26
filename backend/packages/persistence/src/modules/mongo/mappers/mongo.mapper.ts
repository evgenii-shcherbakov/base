import { BaseQuery, DatabaseEntity } from '@backend/common';
import _ from 'lodash';
import { MongoEntity } from 'modules/mongo/mongo.entity';
import { FilterQuery } from 'mongoose';

export class MongoMapper<
  Entity extends DatabaseEntity,
  Doc extends MongoEntity,
  Query extends BaseQuery = BaseQuery & Partial<Entity>,
> {
  transformQuery({ id, ids, ...rest }: Query): FilterQuery<Doc> {
    const result: FilterQuery<any> = _.omitBy(rest, _.isNil);

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
