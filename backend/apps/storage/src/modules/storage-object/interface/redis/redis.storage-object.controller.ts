import { StorageObjectParentUpdateEvent } from '@backend/event-bus';
import { NestAuth } from '@backend/proto';
import {
  RedisController,
  RedisEvent,
  RedisStorageObjectEventController,
  RedisStorageObjectTransport,
  RedisUserCreateEventHandler,
  RedisUserTransport,
} from '@backend/redis';
import { StorageObjectCreateRootFolderUseCase } from '@modules/storage-object/application/use-cases/storage-object.create-root-folder.use-case';
import { StorageObjectUpdateFolderChildrenUseCase } from '@modules/storage-object/application/use-cases/storage-object.update-folder-children.use-case';

@RedisController({ consumer: 'storage.storage-object' })
@RedisStorageObjectTransport.ControllerMethods()
export class RedisStorageObjectController
  implements RedisStorageObjectEventController, RedisUserCreateEventHandler
{
  constructor(
    private readonly createRootFolderUseCase: StorageObjectCreateRootFolderUseCase,
    private readonly updateFolderChildrenUseCase: StorageObjectUpdateFolderChildrenUseCase,
  ) {}

  async onParentUpdate(event: StorageObjectParentUpdateEvent): Promise<void> {
    await this.updateFolderChildrenUseCase.execute(event.parent, event.update);
  }

  @RedisEvent(RedisUserTransport.CREATE)
  async onUserCreate(event: NestAuth.User): Promise<void> {
    await this.createRootFolderUseCase.execute(event.id);
  }
}
