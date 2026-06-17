import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotFoundError } from 'rxjs';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(User) private userRepository:Repository<User>
    ){
    }

    async addAdmin(userId:string){
        const isAdmin = await this.userRepository.findOne({where:{id:userId}})

        if(!isAdmin){
            throw new ConflictException('Admin profile already exist');
        }

        // CHECK FOR USER 
        const user = await this.userRepository.findOne({
        where: { id: userId },
        });

        if (!user) {
        throw new Error('User not found');
        }

        // convert string to array
        let roles: string[] = [];

        try {
        roles = JSON.parse(user.roles ?? '[]');
        } catch {
        roles = [];
        }

        // add role only if missing
        if (!roles.includes('driver')) {
        roles.push('admin');

        // array → string
        user.roles = JSON.stringify(roles);

        await this.userRepository.save(user);

        }

        return user
}
}
