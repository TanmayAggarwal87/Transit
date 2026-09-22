import { Test, TestingModule } from '@nestjs/testing';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';

import { getRepositoryToken } from '@nestjs/typeorm';
import { Driver } from './entities/driver.entity';
import { VerifiedDriverGuard } from 'src/auth/guards/verified-driver.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/role.guard';

describe('DriversController', () => {
  let controller: DriversController;
  let driverService: any;

  beforeEach(async () => {
    driverService = {
      register: jest.fn(),
      findById: jest.fn(),
      updateProfile: jest.fn(),
      addBankDetails: jest.fn(),
      updateBankDetails: jest.fn(),
      toggleStatus: jest.fn(),
      setBreak: jest.fn(),
      resume: jest.fn(),
      updateDriverLocation: jest.fn(),
      uploadDriverDocument: jest.fn(),
      getDriverDocuments: jest.fn(),
      viewDriverDocument: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DriversController],
      providers: [
        { provide: DriversService, useValue: driverService },
        { provide: getRepositoryToken(Driver), useValue: {} },
      ],
    })
      .overrideGuard(VerifiedDriverGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DriversController>(DriversController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call driverService.updateDriverLocation when updateLocation endpoint is hit', async () => {
    driverService.updateDriverLocation.mockResolvedValue({
      success: true,
      driverId: 'driver-1',
      lat: 12.97,
      lng: 77.59,
    });

    const result = await controller.updateLocation(
      { userId: 'user-1' },
      { lat: 12.97, lng: 77.59, heading: 90 },
    );

    expect(driverService.updateDriverLocation).toHaveBeenCalledWith('user-1', {
      lat: 12.97,
      lng: 77.59,
      heading: 90,
    });
    expect(result.success).toBe(true);
  });
});
