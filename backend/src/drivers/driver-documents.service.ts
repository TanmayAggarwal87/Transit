import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverDocument, DocumentStatus } from './entities/driver-document.entity';
import { StorageService } from '../storage/storage.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { Driver } from './entities/driver.entity';

/**
 * DriverDocumentsService handles driver document uploads, storage, and retrieval
 * All documents are stored privately on Cloudinary and accessed via signed URLs only
 */
@Injectable()
export class DriverDocumentsService {
  constructor(
    @InjectRepository(DriverDocument)
    private driverDocumentRepository: Repository<DriverDocument>,
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    private storageService: StorageService,
  ) {}

  /**
   * Uploads or updates a driver document
   * If document of same type exists, replaces it; otherwise creates new
   * 
   * @param driverId - Driver ID
   * @param file - Multer file
   * @param dto - Upload document DTO
   * @returns Saved document
   */
  async uploadDocument(
    driverId: string,
    file: Express.Multer.File,
    dto: UploadDocumentDto,
  ): Promise<DriverDocument> {
    // Verify driver exists
    const driver = await this.driverRepository.findOne({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException(
        'Driver profile not found — complete registration first',
      );
    }

    // Check if document already exists
    const existingDocument = await this.driverDocumentRepository.findOne({
      where: {
        driver_id: driverId,
        documentType: dto.documentType,
      },
    });

    // Upload file to Cloudinary
    const uploadResult = await this.storageService.uploadFile(
      file,
      `drivers/${driverId}/${dto.documentType}`,
    );

    const encodedFilePath = this.storageService.encodeFilePath(
      uploadResult.publicId,
      uploadResult.resourceType,
      uploadResult.format,
    );

    if (existingDocument) {
      // Delete old file from Cloudinary
      try {
        const oldFileData = this.storageService.parseFilePath(
          existingDocument.filePath,
        );
        await this.storageService.deleteFile(
          oldFileData.publicId,
          oldFileData.resourceType,
        );
      } catch {
        // Continue even if deletion fails
      }

      // Update existing document
      existingDocument.filePath = encodedFilePath;
      existingDocument.status = DocumentStatus.PENDING;
      if (dto.expiresAt) {
        existingDocument.expiresAt = new Date(dto.expiresAt);
      }

      return this.driverDocumentRepository.save(existingDocument);
    }

    // Create new document
    const newDocument = this.driverDocumentRepository.create({
      driver_id: driverId,
      documentType: dto.documentType,
      filePath: encodedFilePath,
      status: DocumentStatus.PENDING,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    return this.driverDocumentRepository.save(newDocument);
  }

  /**
   * Finds all documents for a driver
   * @param driverId - Driver ID
   * @returns Array of driver documents
   */
  async findByDriverId(driverId: string): Promise<DriverDocument[]> {
    return this.driverDocumentRepository.find({
      where: { driver_id: driverId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Generates a signed URL for viewing a document
   * Verifies the requesting user owns the driver profile
   * 
   * @param documentId - Document ID
   * @param requestingUserId - User ID making the request
   * @returns Object with signed URL (valid for 5 minutes)
   */
  async getSignedViewUrl(
    documentId: string,
    requestingUserId: string,
  ): Promise<{ url: string }> {
    const document = await this.driverDocumentRepository.findOne({
      where: { id: documentId },
      relations: ['driver', 'driver.user'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Verify ownership
    if (document.driver.user.id !== requestingUserId) {
      throw new BadRequestException(
        'You do not have permission to view this document',
      );
    }

    const fileData = this.storageService.parseFilePath(document.filePath);
    const url = this.storageService.getSignedUrl(
      fileData.publicId,
      fileData.resourceType,
      fileData.format,
      300, // 5 minutes
    );

    return { url };
  }

  /**
   * Finds a document by ID
   * @param documentId - Document ID
   * @returns Document or null
   */
  async findById(documentId: string): Promise<DriverDocument | null> {
    return this.driverDocumentRepository.findOne({
      where: { id: documentId },
      relations: ['driver'],
    });
  }

  /**
   * Deletes a document and its file from storage
   * @param documentId - Document ID
   * @param requestingUserId - User ID making the request
   */
  async deleteDocument(
    documentId: string,
    requestingUserId: string,
  ): Promise<void> {
    const document = await this.driverDocumentRepository.findOne({
      where: { id: documentId },
      relations: ['driver', 'driver.user'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Verify ownership
    if (document.driver.user.id !== requestingUserId) {
      throw new BadRequestException(
        'You do not have permission to delete this document',
      );
    }

    // Delete from Cloudinary
    try {
      const fileData = this.storageService.parseFilePath(document.filePath);
      await this.storageService.deleteFile(
        fileData.publicId,
        fileData.resourceType,
      );
    } catch {
      // Continue even if deletion fails
    }

    // Delete from database
    await this.driverDocumentRepository.remove(document);
  }
}
