import { BaseQueryDto } from '@backend/common';
import { ApiProperty } from '@nestjs/swagger';
import { RpcContactQuery } from '@packages/grpc.nest';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RpcContactQueryDto extends BaseQueryDto implements RpcContactQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isPublic?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isVisible?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;
}
