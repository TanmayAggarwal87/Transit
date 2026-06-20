import { Test, TestingModule } from '@nestjs/testing';
import { SavedPlaceService } from './saved-place.service';

describe('SavedPlaceService', () => {
  let service: SavedPlaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SavedPlaceService],
    }).compile();

    service = module.get<SavedPlaceService>(SavedPlaceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
