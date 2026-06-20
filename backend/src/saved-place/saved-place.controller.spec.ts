import { Test, TestingModule } from '@nestjs/testing';
import { SavedPlaceController } from './saved-place.controller';

describe('SavedPlaceController', () => {
  let controller: SavedPlaceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavedPlaceController],
    }).compile();

    controller = module.get<SavedPlaceController>(SavedPlaceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
