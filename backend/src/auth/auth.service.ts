import { Injectable } from '@nestjs/common';
import { phone } from 'src/dto/phone.dto';
import { profile } from 'src/dto/profile.dto';

@Injectable()
export class AuthService {

    sendOtp(phone:phone){
        //generate otp
        const otp = Math.floor(Math.random()*1000000).toString().padStart(6, '0');
        // save it to cache using redis


        return {otp}
    }
    verifyOtp(phone:phone,otp:string){
        try {
            if(otp== "123456"){ /* opt stored in cache related to phone return true*/
                // if otp is verified then delete it form the cache to free memory 
                return true
            }
            // chech if phoen numebr is in db or not
            
            if(phone){ // if phone eixts sen it direclt to home page
                //redirect to home page
            }
            //else to user form (/complete profile)
        } catch (error) {
            
        }
    }

    completeProfile(userInfo:profile,phone:phone){
        //take user inputs (name email avatar(optional)) and save it to db along with phone number
        return {
            id:"1234",
            ...userInfo,
            ...phone
        }
    }
}
