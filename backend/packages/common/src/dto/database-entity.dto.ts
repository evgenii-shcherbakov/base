import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';
import { TransformToDate } from 'decorators';
import { DatabaseEntity } from 'interfaces';

export class DatabaseEntityDto implements DatabaseEntity {
  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsMongoId()
  @Type(() => String)
  _id: string;

  @ApiProperty({ type: Date })
  @IsNotEmpty()
  @IsDate()
  @TransformToDate()
  createdAt: Date;

  @ApiProperty({ type: Date, required: false })
  @IsOptional()
  @IsDate()
  @TransformToDate()
  updatedAt?: Date;
}
