import { NestStorage } from '@backend/proto';
import {
  RedisController,
  RedisEvent,
  RedisVideoTransport,
  RedisVideoUploadFailEventHandler,
  RedisVideoUploadFinishEventHandler,
} from '@backend/redis';
import { FileUpdateUseCase } from '@modules/file/application/use-cases/file.update.use-case';

@RedisController({ consumer: 'storage.file' })
export class RedisFileController
  implements RedisVideoUploadFinishEventHandler, RedisVideoUploadFailEventHandler
{
  constructor(private readonly updateUseCase: FileUpdateUseCase) {}

  @RedisEvent(RedisVideoTransport.UPLOAD_FAIL)
  async onVideoUploadFail(event: NestStorage.Video): Promise<void> {
    await this.updateUseCase.updateById(event.fileId, {
      set: {
        uploadStatus: NestStorage.FileUploadStatus.FAILED,
      },
    });
  }

  @RedisEvent(RedisVideoTransport.UPLOAD_FINISH)
  async onVideoUploadFinish(event: NestStorage.Video): Promise<void> {
    await this.updateUseCase.updateById(event.fileId, {
      set: {
        uploadStatus: NestStorage.FileUploadStatus.READY,
      },
    });
  }
}
