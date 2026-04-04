import {IsString, Length, MaxLength, min, MinLength} from "class-validator"
export class phone{
    @IsString()
    @MinLength(10)
    @MaxLength(10)
    phone:string
}