import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as cloudinary from 'cloudinary';

/**
 * StorageService handles file uploads and retrieval from Cloudinary
 * 
 * FILE ENCODING SCHEME:
 * filePath is stored as: {resourceType}:{format}:{publicId}
 * Example: "image:jpg:a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 * 
 * This allows us to reconstruct all parameters needed for getSignedUrl() and deleteFile()
 */
@Injectable()
export class StorageService {
  constructor() {
    cloudinary.v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Uploads a file to Cloudinary with private access
   * @param file - Multer file object
   * @param folder - Cloudinary folder path (e.g., 'drivers/uuid/driving_license')
   * @returns Object with publicId, resourceType, and format for later retrieval
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ publicId: string; resourceType: string; format: string }> {
    try {
      const publicId = uuidv4();
      const dataUri = `data:${file.mimetype};base64,${file.buffer.toString(
        'base64',
      )}`;

      const result = await cloudinary.v2.uploader.upload(dataUri, {
        folder,
        public_id: publicId,
        resource_type: 'auto',
        type: 'private',
      });

      // Extract format from original filename or use result.format
      const fileExtension = file.originalname
        .split('.')
        .pop()
        ?.toLowerCase() || result.format || 'pdf';

      return {
        publicId: result.public_id,
        resourceType: result.resource_type,
        format: fileExtension,
      };
    } catch (error) {
      throw new InternalServerErrorException('File upload failed');
    }
  }

  /**
   * Generates a time-limited signed URL for private file access
   * Required for accessing private Cloudinary files
   * 
   * @param publicId - Cloudinary public ID
   * @param resourceType - Resource type (image, video, raw, etc.)
   * @param format - File extension
   * @param expiresInSeconds - URL expiration time (default 300 seconds = 5 minutes)
   * @returns Signed URL for temporary file access
   */
  getSignedUrl(
    publicId: string,
    resourceType: string,
    format: string,
    expiresInSeconds = 300,
  ): string {
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

      return cloudinary.v2.utils.private_download_url(
        publicId,
        format,
        {
          resource_type: resourceType,
          type: 'private',
          expires_at: expiresAt,
        } as any,
      );
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate signed URL');
    }
  }

  /**
   * Deletes a file from Cloudinary
   * Silently ignores "not found" errors
   * 
   * @param publicId - Cloudinary public ID
   * @param resourceType - Resource type (image, video, raw, etc.)
   */
  async deleteFile(publicId: string, resourceType: string): Promise<void> {
    try {
      await cloudinary.v2.uploader.destroy(publicId, {
        resource_type: resourceType,
        type: 'private',
      });
    } catch (error: any) {
      // Silently ignore "not found" errors
      if (error.message?.includes('not found')) {
        return;
      }
      throw new InternalServerErrorException('File deletion failed');
    }
  }

  /**
   * Parses the encoded filePath to extract components
   * @param filePath - Encoded path in format: {resourceType}:{format}:{publicId}
   * @returns Object with publicId, resourceType, and format
   */
  parseFilePath(
    filePath: string,
  ): { publicId: string; resourceType: string; format: string } {
    const [resourceType, format, publicId] = filePath.split(':');
    return { publicId, resourceType, format };
  }

  /**
   * Encodes file components into filePath format
   * @param publicId - Cloudinary public ID
   * @param resourceType - Resource type
   * @param format - File extension
   * @returns Encoded filePath string
   */
  encodeFilePath(
    publicId: string,
    resourceType: string,
    format: string,
  ): string {
    return `${resourceType}:${format}:${publicId}`;
  }
}
