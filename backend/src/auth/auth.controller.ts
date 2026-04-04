import { Body, Controller, Get, Post, ValidationPipe } from '@nestjs/common';
import { phone } from 'src/dto/phone.dto';
import { AuthService } from './auth.service';
import { profile } from 'src/dto/profile.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService:AuthService){}

    @Get()
    test(){
        return ["hello worlds"]
    }

    @Post("/sendOtp")
    sendOtp(@Body(new ValidationPipe()) phone:phone){
        return this.authService.sendOtp(phone)

    }
    @Post("/verifyOtp")
    verifyOtp(@Body() phone:phone, otp:string){
        return this.authService.verifyOtp(phone,otp)
    }

    @Post("/completeProfile")
    completeProfile(@Body(new ValidationPipe()) userInfo:profile, phone:phone){
        return this.authService.completeProfile(userInfo,phone)
    }

}
