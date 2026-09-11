import { NestStorage } from '@backend/proto';
import { Config } from '@/config';
import { FileRepository } from '@modules/file/domain/repositories/file.repository';
import { StorageFileService } from '@modules/storage/domain/services/storage.file.service';
import { StorageVideoService } from '@modules/storage/domain/services/storage.video.service';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Either } from '@sweet-monads/either';
import _ from 'lodash';
import moment from 'moment';

// A video's Bunny guid lives on the video row and is never copied onto the backing file, so the
// relation has to be read to know what to purge from Bunny Stream.
type FileWithVideo = NestStorage.File & { video?: NestStorage.Video };

@Injectable()
export class FileCleanupUseCase {
  private readonly logger = new Logger(FileCleanupUseCase.name);
  private readonly ttlHours: number;

  constructor(
    private readonly fileRepository: FileRepository,
    private readonly storageFileService: StorageFileService,
    private readonly storageVideoService: StorageVideoService,
    configService: ConfigService<Config>,
  ) {
    this.ttlHours = configService.getOrThrow('pendingFileTtlHours', { infer: true });
  }

  // Drops uploads that never completed. Anything newer than the TTL may still be uploading to the
  // provider or waiting on its encode — a video only turns READY once Bunny's webhook says so.
  async execute(): Promise<void> {
    const files = await this.fileRepository.getMany<FileWithVideo>(
      {
        uploadStatuses: [NestStorage.FileUploadStatus.PENDING, NestStorage.FileUploadStatus.FAILED],
        createdBefore: moment().subtract(this.ttlHours, 'hours').toDate(),
      },
      { populate: ['video'] },
    );

    if (!files.length) {
      return;
    }

    // Deleting the ids just read, rather than re-running the query, keeps the row and its provider
    // object in step: what leaves the database here is exactly what is purged from Bunny below.
    const isDeleted = await this.fileRepository.deleteMany({ ids: _.map(files, 'id') });

    if (!isDeleted) {
      this.logger.error(`Failed to drop ${files.length} stale file(s)`);
      return;
    }

    await this.purgeFromProvider(files);
  }

  // The rows are already gone, so a provider that refuses one delete only leaves an orphan object
  // behind — count it and keep going rather than abandoning the rest of the batch.
  private async purgeFromProvider(files: FileWithVideo[]): Promise<void> {
    const results = await Promise.all(_.map(files, (file) => this.purgeOne(file)));
    const orphans = _.size(_.reject(results));

    this.logger.log(`Dropped ${files.length} stale file(s), ${orphans} left at the provider`);
  }

  // A video lives in Bunny Stream under the guid on its own row; a plain file or an image lives in
  // Bunny Storage under the file row's `providerId`.
  private async purgeOne(file: FileWithVideo): Promise<boolean> {
    if (file.video?.providerId) {
      return this.isPurged(file, await this.storageVideoService.deleteVideo(file.video.providerId));
    }

    if (file.providerId) {
      return this.isPurged(file, await this.storageFileService.deleteFile(file.providerId));
    }

    // Neither id is set when the row outlived a provider create call that never came back — there
    // is nothing stored to purge.
    return true;
  }

  private isPurged(
    file: FileWithVideo,
    result: Either<InternalServerErrorException, boolean>,
  ): boolean {
    if (result.isLeft()) {
      this.logger.warn(
        `Failed to purge file ${file.id} from the provider: ${result.value.message}`,
      );
      return false;
    }

    return result.value;
  }
}
