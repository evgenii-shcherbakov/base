/* eslint-disable */
import { RedisQueueClient } from '@/infrastructure/clients';
import { RedisJobContext } from '@/interface/contexts';
import {
  EventBus,
  ImageEventBus,
  StorageObjectEventBus,
  StorageObjectParentUpdateEvent,
  UserEventBus,
  VideoEventBus,
} from '@backend/event-bus';
import type { NestAuth, NestStorage } from '@backend/proto';
import { Abstract, applyDecorators, Type } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { Observable } from 'rxjs';

const RedisUserEventPattern = {
  CREATE: {
    pattern: 'auth.user.create',
  },
};

export const RedisUserTransport = {
  ...RedisUserEventPattern,
  /**
   * Binds the service's own events. The patterns stay bare event ids here —
   * `@RedisController({ consumer })` rewrites them into `<eventId>@<consumerId>`
   * queue names, so it must be applied above this decorator.
   */
  ControllerMethods: (): ClassDecorator => {
    const methodsDecorator = function (constructor: Function) {
      EventPattern('auth.user.create')(
        constructor.prototype['onCreate'],
        'onCreate',
        Reflect.getOwnPropertyDescriptor(constructor.prototype, 'onCreate'),
      );
    };
    return applyDecorators(methodsDecorator);
  },
  EventBus: UserEventBus,
} as const;

export interface RedisUserEventController {
  onCreate(
    event: NestAuth.User,
    context?: RedisJobContext,
  ): void | Promise<void> | Observable<void>;
}

export interface RedisUserCreateEventHandler {
  onUserCreate(
    event: NestAuth.User,
    context?: RedisJobContext,
  ): void | Promise<void> | Observable<void>;
}

const RedisImageEventPattern = {
  DELETE: {
    pattern: 'storage.image.delete',
  },
};

export const RedisImageTransport = {
  ...RedisImageEventPattern,
  /**
   * Binds the service's own events. The patterns stay bare event ids here —
   * `@RedisController({ consumer })` rewrites them into `<eventId>@<consumerId>`
   * queue names, so it must be applied above this decorator.
   */
  ControllerMethods: (): ClassDecorator => {
    const methodsDecorator = function (constructor: Function) {
      EventPattern('storage.image.delete')(
        constructor.prototype['onDelete'],
        'onDelete',
        Reflect.getOwnPropertyDescriptor(constructor.prototype, 'onDelete'),
      );
    };
    return applyDecorators(methodsDecorator);
  },
  EventBus: ImageEventBus,
} as const;

export interface RedisImageEventController {
  onDelete(
    event: NestStorage.Image,
    context?: RedisJobContext,
  ): void | Promise<void> | Observable<void>;
}

export interface RedisImageDeleteEventHandler {
  onImageDelete(
    event: NestStorage.Image,
    context?: RedisJobContext,
  ): void | Promise<void> | Observable<void>;
}

const RedisStorageObjectEventPattern = {
  PARENT_UPDATE: {
    pattern: 'storage.storage.object.parent.update',
  },
};

export const RedisStorageObjectTransport = {
  ...RedisStorageObjectEventPattern,
  /**
   * Binds the service's own events. The patterns stay bare event ids here —
   * `@RedisController({ consumer })` rewrites them into `<eventId>@<consumerId>`
   * queue names, so it must be applied above this decorator.
   */
  ControllerMethods: (): ClassDecorator => {
    const methodsDecorator = function (constructor: Function) {
      EventPattern('storage.storage.object.parent.update')(
        constructor.prototype['onParentUpdate'],
        'onParentUpdate',
        Reflect.getOwnPropertyDescriptor(constructor.prototype, 'onParentUpdate'),
      );
    };
    return applyDecorators(methodsDecorator);
  },
  EventBus: StorageObjectEventBus,
} as const;

export interface RedisStorageObjectEventController {
  onParentUpdate(
    event: StorageObjectParentUpdateEvent,
    context?: RedisJobContext,
  ): void | Promise<void> | Observable<void>;
}

export interface RedisStorageObjectParentUpdateEventHandler {
  onStorageObjectParentUpdate(
    event: StorageObjectParentUpdateEvent,
    context?: RedisJobContext,
  ): void | Promise<void> | Observable<void>;
}

const RedisVideoEventPattern = {
  UPLOAD_FINISH: {
    pattern: 'storage.video.upload.finish',
  },
  UPLOAD_FAIL: {
    pattern: 'storage.video.upload.fail',
  },
};

export const RedisVideoTransport = {
  ...RedisVideoEventPattern,
  /**
   * Binds the service's own events. The patterns stay bare event ids here —
   * `@RedisController({ consumer })` rewrites them into `<eventId>@<consumerId>`
   * queue names, so it must be applied above this decorator.
   */
  ControllerMethods: (): ClassDecorator => {
    const methodsDecorator = function (constructor: Function) {
      EventPattern('storage.video.upload.finish')(
        constructor.prototype['onUploadFinish'],
        'onUploadFinish',
        Reflect.getOwnPropertyDescriptor(constructor.prototype, 'onUploadFinish'),
      );
      EventPattern('storage.video.upload.fail')(
        constructor.prototype['onUploadFail'],
        'onUploadFail',
        Reflect.getOwnPropertyDescriptor(constructor.prototype, 'onUploadFail'),
      );
    };
    return applyDecorators(methodsDecorator);
  },
  EventBus: VideoEventBus,
} as const;

export interface RedisVideoEventController {
  onUploadFinish(
    event: NestStorage.Video,
    context?: RedisJobContext,
  ): void | Promise<void> | Observable<void>;
  onUploadFail(
    event: NestStorage.Video,
    context?: RedisJobContext,
  ): void | Promise<void> | Observable<void>;
}

export interface RedisVideoUploadFinishEventHandler {
  onVideoUploadFinish(
    event: NestStorage.Video,
    context?: RedisJobContext,
  ): void | Promise<void> | Observable<void>;
}

export interface RedisVideoUploadFailEventHandler {
  onVideoUploadFail(
    event: NestStorage.Video,
    context?: RedisJobContext,
  ): void | Promise<void> | Observable<void>;
}

class RedisClientImpl {
  constructor(protected readonly client: RedisQueueClient) {}
}

class RedisUserEventBusClientImpl extends RedisClientImpl implements UserEventBus {
  constructor(protected readonly client: RedisQueueClient) {
    super(client);
  }

  emitCreate(event: NestAuth.User): Promise<any> {
    return this.client.emit('auth.user.create', event);
  }

  emitManyCreate(events: NestAuth.User[]): Promise<any[]> {
    return this.client.emitMany('auth.user.create', events);
  }
}

class RedisImageEventBusClientImpl extends RedisClientImpl implements ImageEventBus {
  constructor(protected readonly client: RedisQueueClient) {
    super(client);
  }

  emitDelete(event: NestStorage.Image): Promise<any> {
    return this.client.emit('storage.image.delete', event);
  }

  emitManyDelete(events: NestStorage.Image[]): Promise<any[]> {
    return this.client.emitMany('storage.image.delete', events);
  }
}

class RedisStorageObjectEventBusClientImpl
  extends RedisClientImpl
  implements StorageObjectEventBus
{
  constructor(protected readonly client: RedisQueueClient) {
    super(client);
  }

  emitParentUpdate(event: StorageObjectParentUpdateEvent): Promise<any> {
    return this.client.emit('storage.storage.object.parent.update', event);
  }

  emitManyParentUpdate(events: StorageObjectParentUpdateEvent[]): Promise<any[]> {
    return this.client.emitMany('storage.storage.object.parent.update', events);
  }
}

class RedisVideoEventBusClientImpl extends RedisClientImpl implements VideoEventBus {
  constructor(protected readonly client: RedisQueueClient) {
    super(client);
  }

  emitUploadFinish(event: NestStorage.Video): Promise<any> {
    return this.client.emit('storage.video.upload.finish', event);
  }

  emitManyUploadFinish(events: NestStorage.Video[]): Promise<any[]> {
    return this.client.emitMany('storage.video.upload.finish', events);
  }

  emitUploadFail(event: NestStorage.Video): Promise<any> {
    return this.client.emit('storage.video.upload.fail', event);
  }

  emitManyUploadFail(events: NestStorage.Video[]): Promise<any[]> {
    return this.client.emitMany('storage.video.upload.fail', events);
  }
}

export class RedisClientFactory {
  private static clientsMap = new Map<Abstract<EventBus>, Type>([
    [UserEventBus, RedisUserEventBusClientImpl],
    [ImageEventBus, RedisImageEventBusClientImpl],
    [StorageObjectEventBus, RedisStorageObjectEventBusClientImpl],
    [VideoEventBus, RedisVideoEventBusClientImpl],
  ]);

  static create(client: RedisQueueClient, EventBusClass: Abstract<EventBus>): Type {
    const Client = this.clientsMap.get(EventBusClass);

    if (!Client) {
      throw new Error(`Redis client for ${EventBusClass} not found`);
    }

    return new Client(client);
  }
}

/**
 * Events owned by each host. `RedisModule.forRoot({ host })` feeds the host's entry to the
 * mediator, which runs one fan-out worker per event queue listed here.
 */
export const REDIS_HOST_EVENTS: Record<string, readonly string[]> = {
  auth: ['auth.user.create'],
  storage: [
    'storage.image.delete',
    'storage.storage.object.parent.update',
    'storage.video.upload.finish',
    'storage.video.upload.fail',
  ],
};
