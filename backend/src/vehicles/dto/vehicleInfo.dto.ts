import { IsBoolean, IsString } from "class-validator";

export class VehicleInfoDto{
    @IsString()
    licensePlate?:string

    @IsString()
    make?:string

    @IsString()
    model?:string

    @IsString()
    fuelType?:string


    
}