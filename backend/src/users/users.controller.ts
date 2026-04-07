import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CompleteProfileDto } from 'src/dto/complete-profile.dto';
import { phone } from 'src/dto/phone.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private usersService:UsersService){}
    @Get(":id") // add middlewarre too 
    findAll(@Param('id') id: string) {
        return this.usersService.findAll(id)
    }
    @Patch(":id")
    updateInfo(
        @Param('id') id: string,
        @Body() userInfo: CompleteProfileDto,
        @Req() req,){
            return this.usersService.updateInfo(id,userInfo)
        

    }
    @Patch("/emergency/:id")
    addEmergency(
        @Param("id") id:string,
        @Body() userInfo: CompleteProfileDto,
    ){
        return this.usersService.addEmergency(id,userInfo)
    }

    @Delete("/emergency/:id")
    deleteEmergency(
        @Param("id") id:string,
    ){
        return this.usersService.deleteEmergency(id)
        
    }

}
