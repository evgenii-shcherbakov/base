/* eslint-disable */
import { NatsJetStreamClient } from '@/infrastructure/clients';
import { NatsStreamData } from '@/infrastructure/types';
import { globalStreamRegistry } from '@/infrastructure/utils';
import { NatsMessageContext } from '@/interface/contexts';
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

const NatsUserEventPattern = {
  CREATE: {
    pattern: 'auth-user-create',
    registerStream: (): void => {
      globalStreamRegistry.append({ name: 'auth-user-stream', subjects: ['auth-user-create'] });
    },
  },
};

export const NatsUserTransport = {
  ...NatsUserEventPattern,
  /**
   * Binds the service's own events. The patterns stay bare subjects here —
   * `@NatsController({ consumer })` rewrites them into `<subject>@<consumerId>`,
   * so it must be applied above this decorator.
   */
  ControllerMethods: (): ClassDecorator => {
    const methodsDecorator = function (constructor: Function) {
      EventPattern('auth-user-create')(
        constructor.prototype['onCreate'],
        'onCreate',
        Reflect.getOwnPropertyDescriptor(constructor.prototype, 'onCreate'),
      );
      NatsUserEventPattern.CREATE.registerStream();
    };
    return applyDecorators(methodsDecorator);
  },
  EventBus: UserEventBus,
} as const;

export interface NatsUserEventController {
  onCreate(
    event: NestAuth.User,
    context?: NatsMessageContext,
  ): void | Promise<void> | Observable<void>;
}

export interface NatsUserCreateEventHandler {
  onUserCreate(
    event: NestAuth.User,
    context?: NatsMessageContext,
  ): void | Promise<void> | Observable<void>;
}

const NatsImageEventPattern = {
  DELETE: {
    pattern: 'storage-image-delete',
    registerStream: (): void => {
      globalStreamRegistry.append({
        name: 'storage-image-stream',
        subjects: ['storage-image-delete'],
      });
    },
  },
};

export const NatsImageTransport = {
  ...NatsImageEventPattern,
  /**
   * Binds the service's own events. The patterns stay bare subjects here —
   * `@NatsController({ consumer })` rewrites them into `<subject>@<consumerId>`,
   * so it must be applied above this decorator.
   */
  ControllerMethods: (): ClassDecorator => {
    const methodsDecorator = function (constructor: Function) {
      EventPattern('storage-image-delete')(
        constructor.prototype['onDelete'],
        'onDelete',
        Reflect.getOwnPropertyDescriptor(constructor.prototype, 'onDelete'),
      );
      NatsImageEventPattern.DELETE.registerStream();
    };
    return applyDecorators(methodsDecorator);
  },
  EventBus: ImageEventBus,
} as const;

export interface NatsImageEventController {
  onDelete(
    event: NestStorage.Image,
    context?: NatsMessageContext,
  ): void | Promise<void> | Observable<void>;
}

export interface NatsImageDeleteEventHandler {
  onImageDelete(
    event: NestStorage.Image,
    context?: NatsMessageContext,
  ): void | Promise<void> | Observable<void>;
}

const NatsStorageObjectEventPattern = {
  PARENT_UPDATE: {
    pattern: 'storage-storage-object-parent-update',
    registerStream: (): void => {
      globalStreamRegistry.append({
        name: 'storage-storage-object-stream',
        subjects: ['storage-storage-object-parent-update'],
      });
    },
  },
};

export const NatsStorageObjectTransport = {
  ...NatsStorageObjectEventPattern,
  /**
   * Binds the service's own events. The patterns stay bare subjects here —
   * `@NatsController({ consumer })` rewrites them into `<subject>@<consumerId>`,
   * so it must be applied above this decorator.
   */
  ControllerMethods: (): ClassDecorator => {
    const methodsDecorator = function (constructor: Function) {
      EventPattern('storage-storage-object-parent-update')(
        constructor.prototype['onParentUpdate'],
        'onParentUpdate',
        Reflect.getOwnPropertyDescriptor(constructor.prototype, 'onParentUpdate'),
      );
      NatsStorageObjectEventPattern.PARENT_UPDATE.registerStream();
    };
    return applyDecorators(methodsDecorator);
  },
  EventBus: StorageObjectEventBus,
} as const;

export interface NatsStorageObjectEventController {
  onParentUpdate(
    event: StorageObjectParentUpdateEvent,
    context?: NatsMessageContext,
  ): void | Promise<void> | Observable<void>;
}

export interface NatsStorageObjectParentUpdateEventHandler {
  onStorageObjectParentUpdate(
    event: StorageObjectParentUpdateEvent,
    context?: NatsMessageContext,
  ): void | Promise<void> | Observable<void>;
}

const NatsVideoEventPattern = {
  UPLOADED: {
    pattern: 'storage-video-uploaded',
    registerStream: (): void => {
      globalStreamRegistry.append({
        name: 'storage-video-stream',
        subjects: ['storage-video-uploaded'],
      });
    },
  },
  UPLOAD_FINISH: {
    pattern: 'storage-video-upload-finish',
    registerStream: (): void => {
      globalStreamRegistry.append({
        name: 'storage-video-stream',
        subjects: ['storage-video-upload-finish'],
      });
    },
  },
  UPLOAD_FAIL: {
    pattern: 'storage-video-upload-fail',
    registerStream: (): void => {
      globalStreamRegistry.append({
        name: 'storage-video-stream',
        subjects: ['storage-video-upload-fail'],
      });
    },
  },
};

export const NatsVideoTransport = {
  ...NatsVideoEventPattern,
  /**
   * Binds the service's own events. The patterns stay bare subjects here —
   * `@NatsController({ consumer })` rewrites them into `<subject>@<consumerId>`,
   * so it must be applied above this decorator.
   */
  ControllerMethods: (): ClassDecorator => {
    const methodsDecorator = function (constructor: Function) {
      EventPattern('storage-video-uploaded')(
        constructor.prototype['onUploaded'],
        'onUploaded',
        Reflect.getOwnPropertyDescriptor(constructor.prototype, 'onUploaded'),
      );
      NatsVideoEventPattern.UPLOADED.registerStream();
      EventPattern('storage-video-upload-finish')(
        constructor.prototype['onUploadFinish'],
        'onUploadFinish',
        Reflect.getOwnPropertyDescriptor(constructor.prototype, 'onUploadFinish'),
      );
      NatsVideoEventPattern.UPLOAD_FINISH.registerStream();
      EventPattern('storage-video-upload-fail')(
        constructor.prototype['onUploadFail'],
        'onUploadFail',
        Reflect.getOwnPropertyDescriptor(constructor.prototype, 'onUploadFail'),
      );
      NatsVideoEventPattern.UPLOAD_FAIL.registerStream();
    };
    return applyDecorators(methodsDecorator);
  },
  EventBus: VideoEventBus,
} as const;

export interface NatsVideoEventController {
  onUploaded(
    event: NestStorage.Video,
    context?: NatsMessageContext,
  ): void | Promise<void> | Observable<void>;
  onUploadFinish(
    event: NestStorage.Video,
    context?: NatsMessageContext,
  ): void | Promise<void> | Observable<void>;
  onUploadFail(
    event: NestStorage.Video,
    context?: NatsMessageContext,
  ): void | Promise<void> | Observable<void>;
}

export interface NatsVideoUploadedEventHandler {
  onVideoUploaded(
    event: NestStorage.Video,
    context?: NatsMessageContext,
  ): void | Promise<void> | Observable<void>;
}

export interface NatsVideoUploadFinishEventHandler {
  onVideoUploadFinish(
    event: NestStorage.Video,
    context?: NatsMessageContext,
  ): void | Promise<void> | Observable<void>;
}

export interface NatsVideoUploadFailEventHandler {
  onVideoUploadFail(
    event: NestStorage.Video,
    context?: NatsMessageContext,
  ): void | Promise<void> | Observable<void>;
}

class NatsClientImpl {
  constructor(protected readonly client: NatsJetStreamClient) {}
}

class NatsUserEventBusClientImpl extends NatsClientImpl implements UserEventBus {
  constructor(protected readonly client: NatsJetStreamClient) {
    super(client);
  }

  emitCreate(event: NestAuth.User): Promise<any> {
    return this.client.emit('auth-user-create', event);
  }

  emitManyCreate(events: NestAuth.User[]): Promise<any[]> {
    return this.client.emitMany('auth-user-create', events);
  }
}

class NatsImageEventBusClientImpl extends NatsClientImpl implements ImageEventBus {
  constructor(protected readonly client: NatsJetStreamClient) {
    super(client);
  }

  emitDelete(event: NestStorage.Image): Promise<any> {
    return this.client.emit('storage-image-delete', event);
  }

  emitManyDelete(events: NestStorage.Image[]): Promise<any[]> {
    return this.client.emitMany('storage-image-delete', events);
  }
}

class NatsStorageObjectEventBusClientImpl extends NatsClientImpl implements StorageObjectEventBus {
  constructor(protected readonly client: NatsJetStreamClient) {
    super(client);
  }

  emitParentUpdate(event: StorageObjectParentUpdateEvent): Promise<any> {
    return this.client.emit('storage-storage-object-parent-update', event);
  }

  emitManyParentUpdate(events: StorageObjectParentUpdateEvent[]): Promise<any[]> {
    return this.client.emitMany('storage-storage-object-parent-update', events);
  }
}

class NatsVideoEventBusClientImpl extends NatsClientImpl implements VideoEventBus {
  constructor(protected readonly client: NatsJetStreamClient) {
    super(client);
  }

  emitUploaded(event: NestStorage.Video): Promise<any> {
    return this.client.emit('storage-video-uploaded', event);
  }

  emitManyUploaded(events: NestStorage.Video[]): Promise<any[]> {
    return this.client.emitMany('storage-video-uploaded', events);
  }

  emitUploadFinish(event: NestStorage.Video): Promise<any> {
    return this.client.emit('storage-video-upload-finish', event);
  }

  emitManyUploadFinish(events: NestStorage.Video[]): Promise<any[]> {
    return this.client.emitMany('storage-video-upload-finish', events);
  }

  emitUploadFail(event: NestStorage.Video): Promise<any> {
    return this.client.emit('storage-video-upload-fail', event);
  }

  emitManyUploadFail(events: NestStorage.Video[]): Promise<any[]> {
    return this.client.emitMany('storage-video-upload-fail', events);
  }
}

export class NatsClientFactory {
  private static clientsMap = new Map<Abstract<EventBus>, Type>([
    [UserEventBus, NatsUserEventBusClientImpl],
    [ImageEventBus, NatsImageEventBusClientImpl],
    [StorageObjectEventBus, NatsStorageObjectEventBusClientImpl],
    [VideoEventBus, NatsVideoEventBusClientImpl],
  ]);

  static create(client: NatsJetStreamClient, EventBusClass: Abstract<EventBus>): Type {
    const Client = this.clientsMap.get(EventBusClass);

    if (!Client) {
      throw new Error(`Nats client for ${EventBusClass} not found`);
    }

    return new Client(client);
  }
}

/**
 * Streams owned by each host. `NatsModule.forRoot({ host })` feeds the host's entry to the
 * stream provisioner, which declares them at bootstrap — including for a host that only
 * emits and has no subscriber controller of its own loaded.
 */
export const NATS_HOST_STREAMS: Record<string, readonly NatsStreamData[]> = {
  auth: [
    {
      name: 'auth-user-stream',
      subjects: ['auth-user-create'],
    },
  ],
  storage: [
    {
      name: 'storage-image-stream',
      subjects: ['storage-image-delete'],
    },
    {
      name: 'storage-storage-object-stream',
      subjects: ['storage-storage-object-parent-update'],
    },
    {
      name: 'storage-video-stream',
      subjects: [
        'storage-video-uploaded',
        'storage-video-upload-finish',
        'storage-video-upload-fail',
      ],
    },
  ],
};
