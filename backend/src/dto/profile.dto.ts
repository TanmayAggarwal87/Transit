import { IsEmail, IsString, Length } from "class-validator"

export class profile{
    @IsString()
    @Length(3,50)
    name:string
    @IsString()
    @IsEmail()
    email:string
    avatar:string
}