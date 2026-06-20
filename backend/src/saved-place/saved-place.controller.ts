import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SavedPlaceService } from './saved-place.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-users.decorator';
import { SavedPlaceDTO } from './dto/saved-places.dto';

@Controller(['users/saved-place', 'saved-places'])
@UseGuards(JwtAuthGuard)
export class SavedPlaceController {
  constructor(private savedPlaceService: SavedPlaceService) {}

  @Get()
  fetchPlaces(@CurrentUser() userInfo) {
    return this.savedPlaceService.fetchPlaces(userInfo.userId);
  }

  @Post()
  addPlaces(@CurrentUser() userInfo, @Body() dto: SavedPlaceDTO) {
    return this.savedPlaceService.addPlaces(userInfo.userId, dto);
  }

  @Patch(':id')
  updatePlaces(
    @CurrentUser() userInfo,
    @Param('id') placeId: string,
    @Body() dto: Partial<SavedPlaceDTO>,
  ) {
    return this.savedPlaceService.updatePlaces(userInfo.userId, placeId, dto);
  }

  @Delete(':id')
  deletePlace(@CurrentUser() userInfo, @Param('id') placeId: string) {
    return this.savedPlaceService.deletePlace(userInfo.userId, placeId);
  }
}
