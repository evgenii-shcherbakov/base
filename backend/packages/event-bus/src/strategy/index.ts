import type { NestAuth, NestStorage } from '@backend/proto';
import { StorageObjectParentUpdateEvent } from './events';

/**
 * @description Add new events with their types here
 * @example should be in format:
 * {
 *   [host]: {
 *     [service]: {
 *       [event]: EventType
 *     }
 *   }
 * }
 */
export interface EventBusStrategy {
  auth: {
    user: {
      create: NestAuth.User;
    };
  };
  storage: {
    image: {
      delete: NestStorage.Image;
    };
    storageObject: {
      parentUpdate: StorageObjectParentUpdateEvent;
    };
    // Three stages, in order: `uploaded` = the bytes reached Bunny, `uploadFinish` = Bunny finished
    // encoding and the video is playable, `uploadFail` = it will never play. The file module
    // consumes all three and maps them to UPLOADED / READY / FAILED.
    video: {
      uploaded: NestStorage.Video;
      uploadFinish: NestStorage.Video;
      uploadFail: NestStorage.Video;
    };
  };
}
