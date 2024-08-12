import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { ContactType } from '@packages/common';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { EntityDto } from 'dto/models/entity.dto';
import { Contact, ContactBase } from 'interfaces';

export class ContactBaseDto implements ContactBase {
  @ApiProperty({ type: Boolean })
  @IsNotEmpty()
  @IsBoolean()
  isPublic: boolean;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsUrl()
  link?: string;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    enum: ContactType,
    enumName: 'ContactType',
  })
  @IsNotEmpty()
  @IsEnum(ContactType)
  type: ContactType;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  value: string;
}

export class ContactDto extends IntersectionType(ContactBaseDto, EntityDto) implements Contact {}
