import { DatabaseEntityDto } from '@backend/common';
import { ApiProperty } from '@nestjs/swagger';
import { Contact } from '@packages/grpc.nest';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ContactDto extends DatabaseEntityDto implements Contact {
  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  isPublic: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  value: string;
}
