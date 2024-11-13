import { BaseQueryDto, TransformToBoolean } from '@backend/common';
import { ApiProperty } from '@nestjs/swagger';
import { ContactQuery } from '@packages/grpc.nest';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ContactQueryDto extends BaseQueryDto implements ContactQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @TransformToBoolean()
  isPublic?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;
}
