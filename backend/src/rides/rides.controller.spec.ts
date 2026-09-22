import { Test, TestingModule } from '@nestjs/testing';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';
import { PricingService } from './pricing.service';
import { DriversService } from 'src/drivers/drivers.service';

describe('RidesController', () => {
  let controller: RidesController;
  let ridesService: any;
  let pricingService: any;
  let driversService: any;

  beforeEach(async () => {
    ridesService = {
      createRide: jest.fn(),
      cancelRide: jest.fn(),
      acceptRide: jest.fn(),
      rejectRide: jest.fn(),
      driverArrived: jest.fn(),
      startTrip: jest.fn(),
      completeTrip: jest.fn(),
    };
    pricingService = {
      estimateFare: jest.fn(),
    };
    driversService = {
      findByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RidesController],
      providers: [
        { provide: RidesService, useValue: ridesService },
        { provide: PricingService, useValue: pricingService },
        { provide: DriversService, useValue: driversService },
      ],
    }).compile();

    controller = module.get<RidesController>(RidesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call ridesService.cancelRide when cancelRide endpoint is hit', async () => {
    ridesService.cancelRide.mockResolvedValue({ id: 'ride-1', status: 'cancelled' });
    const result = await controller.cancelRide({ userId: 'user-1' }, 'ride-1', {
      reason: 'Driver too far',
    });
    expect(ridesService.cancelRide).toHaveBeenCalledWith('user-1', 'ride-1', 'Driver too far');
    expect(result).toEqual({ id: 'ride-1', status: 'cancelled' });
  });
});
