'use client';

import { internalHttpClient } from '@/common/clients';
import { getErrorMessage } from '@/common/helpers';
import { UploadFileAction } from '@/features/storage/types';
import { BaseRecord, useNotification } from '@refinedev/core';
import { useCallback, useState } from 'react';

type Params = {
  resource: string;
  // Overrides how the bytes leave the browser; the default posts multipart to the resource's own
  // upload route handler. See `UploadFileAction` for why it carries the `Action` suffix.
  uploadFileAction?: UploadFileAction;
};

export const useSingleFileUpload = ({ resource, uploadFileAction }: Params) => {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const { open } = useNotification();

  const handleUpload = useCallback(
    async <Record extends BaseRecord = BaseRecord>(
      file: File,
      createCallback: () => Promise<Record>,
      field: keyof Record = 'id',
    ): Promise<Record | undefined> => {
      setIsUploading(() => true);
      setProgress(() => 0);

      try {
        const entity = await createCallback();
        const onProgress = (percent: number) => setProgress(() => percent);

        if (uploadFileAction) {
          await uploadFileAction(file, entity, { onProgress });
          return entity;
        }

        const formData = new FormData();
        formData.append('file', file);

        await internalHttpClient.post(`${resource}/${entity[field]}/upload`, formData, {
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || file.size;
            const current = progressEvent.loaded;

            onProgress((current * 100) / total);
          },
          timeout: 0,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });

        return entity;
      } catch (error) {
        open?.({
          type: 'error',
          message: 'Upload error',
          description: getErrorMessage(error),
          key: `${resource}-upload-error-${Date.now()}`,
        });

        return;
      } finally {
        setIsUploading(() => false);
      }
    },
    [resource, uploadFileAction, open],
  );

  return {
    progress,
    isUploading,
    handleUpload,
  };
};
