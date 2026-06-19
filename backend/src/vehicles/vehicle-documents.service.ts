import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DocumentStatus } from 'src/drivers/entities/driver-document.entity';
import { VehicleDocument } from 'src/drivers/entities/vehicle-document.entity';
import { Vehicle } from 'src/drivers/entities/vehicle.entity';
import { StorageService } from 'src/storage/storage.service';
import { Repository } from 'typeorm';
import { VehicleDocumentDto } from './dto/vehicleDocument.dto';

@Injectable()
export class VehicleDocumentsService {
  constructor(
    @InjectRepository(VehicleDocument)
    private vehicleDocumentRepository: Repository<VehicleDocument>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    private storageService: StorageService,
  ) {}

  async uploadDocument(
    vehicleId: string,
    file: any,
    dto: VehicleDocumentDto,
  ): Promise<VehicleDocument> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException(
        'Vehicle not found - register vehicle first',
      );
    }

    const existingDocument = await this.vehicleDocumentRepository.findOne({
      where: {
        vehicle_id: vehicleId,
        documentType: dto.documentType,
      },
    });

    const uploadResult = await this.storageService.uploadFile(
      file,
      `vehicles/${vehicleId}/${dto.documentType}`,
    );

    const encodedFilePath = this.storageService.encodeFilePath(
      uploadResult.publicId,
      uploadResult.resourceType,
      uploadResult.format,
    );

    if (existingDocument) {
      try {
        const oldFileData = this.storageService.parseFilePath(
          existingDocument.filePath,
        );
        await this.storageService.deleteFile(
          oldFileData.publicId,
          oldFileData.resourceType,
        );
      } catch {
        // Continue even if deletion fails.
      }

      existingDocument.filePath = encodedFilePath;
      existingDocument.status = DocumentStatus.PENDING;
      existingDocument.verifiedBy = null;
      existingDocument.verifiedAt = null;
      if (dto.expiresAt) {
        existingDocument.expiresAt = new Date(dto.expiresAt);
      }

      return this.vehicleDocumentRepository.save(existingDocument);
    }

    const newDocument = this.vehicleDocumentRepository.create({
      vehicle_id: vehicleId,
      documentType: dto.documentType,
      filePath: encodedFilePath,
      status: DocumentStatus.PENDING,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    return this.vehicleDocumentRepository.save(newDocument);
  }

  async findByVehicleId(vehicleId: string): Promise<VehicleDocument[]> {
    return this.vehicleDocumentRepository.find({
      where: { vehicle_id: vehicleId },
      order: { createdAt: 'DESC' },
    });
  }

  async getSignedViewUrl(
    documentId: string,
    requestingUserId: string,
  ): Promise<{ url: string }> {
    const document = await this.vehicleDocumentRepository.findOne({
      where: { id: documentId },
      relations: ['vehicle', 'vehicle.driver', 'vehicle.driver.user'],
    });

    if (!document) {
      throw new NotFoundException('Vehicle document not found');
    }

    if (document.vehicle.driver.user.id !== requestingUserId) {
      throw new BadRequestException(
        'You do not have permission to view this document',
      );
    }

    const fileData = this.storageService.parseFilePath(document.filePath);
    const url = this.storageService.getSignedUrl(
      fileData.publicId,
      fileData.resourceType,
      fileData.format,
      300,
    );

    return { url };
  }

  async findById(documentId: string): Promise<VehicleDocument | null> {
    return this.vehicleDocumentRepository.findOne({
      where: { id: documentId },
      relations: ['vehicle'],
    });
  }

  async deleteDocument(
    documentId: string,
    requestingUserId: string,
  ): Promise<void> {
    const document = await this.vehicleDocumentRepository.findOne({
      where: { id: documentId },
      relations: ['vehicle', 'vehicle.driver', 'vehicle.driver.user'],
    });

    if (!document) {
      throw new NotFoundException('Vehicle document not found');
    }

    if (document.vehicle.driver.user.id !== requestingUserId) {
      throw new BadRequestException(
        'You do not have permission to delete this document',
      );
    }

    try {
      const fileData = this.storageService.parseFilePath(document.filePath);
      await this.storageService.deleteFile(
        fileData.publicId,
        fileData.resourceType,
      );
    } catch {
      // Continue even if deletion fails.
    }

    await this.vehicleDocumentRepository.remove(document);
  }
}
