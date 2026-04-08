import { Injectable, Logger } from '@nestjs/common';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import { config } from '../../../infrastructure/config';

type UploadAssetOptions = {
  key: string;
  buffer: Buffer;
  resourceType: 'image' | 'raw';
  format?: string;
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly enabled: boolean;
  private readonly folder: string;

  constructor() {
    const hasCredentials =
      Boolean(config.storage.cloudinary.cloudName) &&
      Boolean(config.storage.cloudinary.apiKey) &&
      Boolean(config.storage.cloudinary.apiSecret);

    this.enabled =
      config.storage.provider === 'cloudinary' &&
      config.storage.cloudinary.enabled &&
      hasCredentials;
    this.folder = this.normalizeFolder(config.storage.cloudinary.folder);

    if (!this.enabled) {
      if (config.storage.provider !== 'cloudinary') {
        this.logger.warn(
          `Storage provider "${config.storage.provider}" is not supported. Falling back to disabled storage`,
        );
      } else if (config.storage.cloudinary.enabled && !hasCredentials) {
        this.logger.warn(
          'Cloudinary enabled but credentials are incomplete. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
        );
      }

      this.logger.warn(
        'Cloudinary storage disabled. Set CLOUDINARY_ENABLED=true and credentials to enable ticket asset upload',
      );
      return;
    }

    cloudinary.config({
      cloud_name: config.storage.cloudinary.cloudName,
      api_key: config.storage.cloudinary.apiKey,
      api_secret: config.storage.cloudinary.apiSecret,
      secure: true,
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  uploadImagePng(key: string, buffer: Buffer): Promise<string | null> {
    return this.uploadAsset({
      key,
      buffer,
      resourceType: 'image',
      format: 'png',
    });
  }

  uploadPdf(key: string, buffer: Buffer): Promise<string | null> {
    return this.uploadAsset({
      key,
      buffer,
      resourceType: 'raw',
      format: 'pdf',
    });
  }

  private async uploadAsset(
    options: UploadAssetOptions,
  ): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    const publicId = this.resolvePublicId(options.key);

    try {
      const response = await this.uploadViaStream({
        buffer: options.buffer,
        resourceType: options.resourceType,
        format: options.format,
        publicId,
      });

      return response.secure_url;
    } catch (error) {
      this.logger.error(
        `Failed uploading asset ${publicId}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }

  private uploadViaStream(options: {
    buffer: Buffer;
    resourceType: 'image' | 'raw';
    format?: string;
    publicId: string;
  }): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: options.publicId,
          resource_type: options.resourceType,
          format: options.format,
          overwrite: true,
          invalidate: true,
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result) {
            reject(new Error('Cloudinary upload failed without result'));
            return;
          }

          resolve(result);
        },
      );

      stream.end(options.buffer);
    });
  }

  private resolvePublicId(key: string): string {
    const normalizedKey = key
      .replace(/^\/+/, '')
      .replace(/\\/g, '/')
      .replace(/\.[^.]+$/, '');

    if (!this.folder) {
      return normalizedKey;
    }

    return `${this.folder}/${normalizedKey}`;
  }

  private normalizeFolder(folder: string): string {
    return folder.trim().replace(/^\/+|\/+$/g, '');
  }
}
