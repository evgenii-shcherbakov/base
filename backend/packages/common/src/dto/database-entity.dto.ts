import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';
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
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ type: Date, required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  updatedAt?: Date;
}
