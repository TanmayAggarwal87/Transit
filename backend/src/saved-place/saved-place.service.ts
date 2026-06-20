import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { SavedPlace } from './entity/saved-place.entity';
import { SavedPlaceDTO } from './dto/saved-places.dto';

@Injectable()
export class SavedPlaceService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(SavedPlace)
    private savedPlaceRepository: Repository<SavedPlace>,
  ) {}

  async fetchPlaces(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const savedPlaces = await this.savedPlaceRepository.find({
      where: { userId },
    });

    if (savedPlaces.length === 0) {
      return { message: 'No places saved' };
    }

    return savedPlaces;
  }

  async addPlaces(userId: string, savedPlaceInfo: SavedPlaceDTO) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const savedPlace = this.savedPlaceRepository.create({
      userId,
      name: savedPlaceInfo.name,
      address: savedPlaceInfo.address,
      latitude: savedPlaceInfo.latitude,
      longitude: savedPlaceInfo.longitude,
      landmark: savedPlaceInfo.landmark,
    });

    return this.savedPlaceRepository.save(savedPlace);
  }

  async updatePlaces(
    userId: string,
    placeId: string,
    updatedPlaceInfo: Partial<SavedPlaceDTO>,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const savedPlace = await this.savedPlaceRepository.findOne({
      where: { id: placeId, userId },
    });
    if (!savedPlace) {
      throw new NotFoundException('Saved place not found');
    }

    Object.assign(savedPlace, updatedPlaceInfo);
    return this.savedPlaceRepository.save(savedPlace);
  }

  async deletePlace(userId: string, placeId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const savedPlace = await this.savedPlaceRepository.findOne({
      where: { id: placeId, userId },
    });
    if (!savedPlace) {
      throw new NotFoundException('Saved place not found');
    }

    await this.savedPlaceRepository.remove(savedPlace);
    return { message: 'Saved place deleted successfully' };
  }
}
