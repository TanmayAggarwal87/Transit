import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CompleteProfileDto } from 'src/dto/complete-profile.dto';
import { rawListeners } from 'process';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User) private userRepository:Repository<User>
    ){}

    async findAll(id:string){
        
        try {
            const user = await this.userRepository.findOne({where:{id:id}})
            if(!user)
            {
                throw new NotFoundException("user not found")
            }
            return {user}
        } catch (error) {
            throw new Error(`${error}`);
        }
    }
    async updateInfo(id:string ,userInfo:CompleteProfileDto){

        try {
            const user = await this.userRepository.findOne({where:{id:id}})
            if(!user)
            {
                throw new NotFoundException("user not found")
            }
            Object.assign(user,userInfo)
            return this.userRepository.save(user)
        } catch (error) {
            throw new Error(`${error}`);
        }
    }

    async addEmergency(id:string, profile:CompleteProfileDto){
        try {
            const user = await this.userRepository.findOne({where:{id:id}})
            if(!user){
                throw new NotFoundException("user not found")
            }
            Object.assign(user,profile)
            return this.userRepository.save(user)
        } catch (error) {
            throw new Error(`${error}`);
        }
    }

    async deleteEmergency(id:string){
        try {
            const user = await this.userRepository.findOne({where:{id:id}})
            if(!user){
                throw new NotFoundException("user not found")
            }
            user.emergencyContact = ""
    
            return this.userRepository.save(user)
        } catch (error) {
            throw new Error(`${error}`);
        }
    }
}
