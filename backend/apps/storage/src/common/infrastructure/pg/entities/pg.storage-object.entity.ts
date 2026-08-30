import { PgEntity, PgProp, PgSchema } from '@backend/pg';
import { NestStorage } from '@backend/proto';
import { PgImageEntity } from '@common/infrastructure/pg/entities/pg.image.entity';
import { PgVideoEntity } from '@common/infrastructure/pg/entities/pg.video.entity';
import { Collection, Ref } from '@mikro-orm/core';
import { Index, ManyToOne, OneToMany, OneToOne, Property } from '@mikro-orm/decorators/legacy';
import { StorageObject } from '@modules/storage-object/domain/entities/storage-object.interface';
import { StorageDatabaseEntity } from '@packages/common';
import { PgFileEntity } from './pg.file.entity';

export const ROOT_FOLDER_UNIQUE_INDEX = 'storage-objects_root_folder_unique';

/**
 * A user owns exactly one root folder. Enforced in the database rather than by a read-then-write
 * check, because the `auth.user.create` subscriber is at-least-once: two replicas (or a stalled
 * BullMQ job handed to a second worker) would otherwise both see "no folder" and both insert.
 */
@Index({
  name: ROOT_FOLDER_UNIQUE_INDEX,
  expression:
    `create unique index "${ROOT_FOLDER_UNIQUE_INDEX}" ` +
    `on "${StorageDatabaseEntity.STORAGE_OBJECT}" ("user_id") ` +
    `where "is_folder" = true and "parent_id" is null`,
})
@PgSchema({ tableName: StorageDatabaseEntity.STORAGE_OBJECT })
export class PgStorageObjectEntity
  extends PgEntity<'children' | 'isDeleted' | 'fileId' | 'imageId' | 'videoId' | 'parentId'>
  implements StorageObject
{
  @Property({ index: true })
  userId: string;

  @Property({ index: true })
  name: string;

  @Property({ index: true, default: false })
  isPublic: boolean;

  @Property({ index: true, default: false })
  isFolder: boolean;

  @Property({ index: true, default: false })
  isDeleted = false;

  @PgProp.Enum({ enum: NestStorage.StorageObjectType, index: true })
  type: NestStorage.StorageObjectType;

  @ManyToOne({
    entity: () => PgStorageObjectEntity,
    nullable: true,
    ref: true,
  })
  parent?: Ref<PgStorageObjectEntity>;

  @Property({ persist: false })
  get parentId() {
    return this.parent?.id;
  }

  @OneToMany({
    entity: () => PgStorageObjectEntity,
    mappedBy: 'parent',
  })
  children = new Collection<PgStorageObjectEntity>(this);

  @OneToOne({
    entity: () => PgFileEntity,
    mappedBy: 'storageObject',
    owner: true,
    nullable: true,
    deleteRule: 'cascade',
    ref: true,
  })
  file?: Ref<NestStorage.File>;

  @Property({ persist: false })
  get fileId() {
    return this.file?.id;
  }

  @Property({ nullable: true })
  folderPath?: string;

  @OneToOne({
    entity: () => PgImageEntity,
    mappedBy: 'storageObject',
    owner: true,
    nullable: true,
    deleteRule: 'cascade',
    ref: true,
  })
  image?: Ref<NestStorage.Image>;

  @Property({ persist: false })
  get imageId() {
    return this.image?.id;
  }

  @OneToOne({
    entity: () => PgVideoEntity,
    mappedBy: 'storageObject',
    owner: true,
    nullable: true,
    deleteRule: 'cascade',
    ref: true,
  })
  video?: Ref<NestStorage.Video>;

  @Property({ persist: false })
  get videoId() {
    return this.video?.id;
  }
}
