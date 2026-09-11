import { PgMapper } from '@backend/pg';
import { NestStorage } from '@backend/proto';
import { PgFileEntity } from '@common/infrastructure/pg/entities/pg.file.entity';
import { ObjectQuery } from '@mikro-orm/core';

export class PgFileMapper extends PgMapper<PgFileEntity, NestStorage.File, NestStorage.FileQuery> {
  transformQuery({
    mimeTypes,
    userIds,
    uploadStatuses,
    createdBefore,
    ...rest
  }: Partial<NestStorage.FileQuery>): ObjectQuery<PgFileEntity> {
    const result = super.transformQuery(rest);

    if (mimeTypes?.length) {
      result.mimeType = { $in: mimeTypes };
    }

    if (userIds?.length) {
      result.userId = { $in: userIds };
    }

    if (uploadStatuses?.length) {
      result.uploadStatus = { $in: uploadStatuses };
    }

    if (createdBefore) {
      result.createdAt = { $lte: createdBefore };
    }

    return result;
  }
}
