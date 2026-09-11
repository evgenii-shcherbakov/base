import { NestStorage } from '@backend/proto';
import { FileMapper } from '@modules/file/application/mappers/file.mapper';
import { StorageObjectValidationService } from '@modules/storage-object/application/services/storage-object.validation.service';
import { StorageVideoService } from '@modules/storage/domain/services/storage.video.service';
import {
  VideoRepository,
  VideoSaveAndPlace,
} from '@modules/video/domain/repositories/video.repository';
import { Injectable } from '@nestjs/common';
import { Either, left, right } from '@sweet-monads/either';

@Injectable()
export class VideoCreateOneUseCase {
  constructor(
    private readonly videoRepository: VideoRepository,
    private readonly storageVideoService: StorageVideoService,
    private readonly fileMapper: FileMapper,
    private readonly storageObjectValidationService: StorageObjectValidationService,
  ) {}

  async execute(
    createData: NestStorage.VideoCreateOne,
  ): Promise<Either<Error, NestStorage.VideoCreated>> {
    const providerId = await this.storageVideoService.createVideo({
      ...createData.video,
      userId: createData.userId,
    });

    if (providerId.isLeft()) {
      return left(providerId.value);
    }

    const saveData: VideoSaveAndPlace = {
      video: {
        ...createData.video,
        userId: createData.userId,
        uploadId: providerId.value,
        providerId: providerId.value,
      },
      file: this.fileMapper.toCreateData(createData.file),
    };

    if (createData.storage) {
      const validationResult = await this.storageObjectValidationService.validateCreateData({
        ...createData.storage,
        type: NestStorage.StorageObjectType.VIDEO,
        userId: createData.userId,
      });

      if (validationResult.isLeft()) {
        return left(validationResult.value);
      }

      saveData.storageObject = validationResult.value;
    }

    const video = await this.videoRepository.saveAndPlaceOne(saveData);

    if (video.isLeft()) {
      return left(video.value);
    }

    // The bytes never reach us: the caller uploads straight to Bunny with these credentials,
    // and the provider reports the outcome back through the status webhook.
    const upload = this.storageVideoService.getTusUpload(video.value.providerId, {
      title: video.value.title,
      mimeType: createData.file.mimeType,
    });

    if (upload.isLeft()) {
      return left(upload.value);
    }

    return right({ video: video.value, upload: upload.value });
  }
}
