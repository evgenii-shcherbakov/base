import { Type as DtoType } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsObject, ValidateNested } from 'class-validator';
import { ListResponse } from 'interfaces';

export const ListResponseDto = <Item extends object>(
  ItemDto: DtoType<Item>,
): DtoType<ListResponse<Item>> => {
  class DynamicListDto implements ListResponse<Item> {
    @ApiProperty({ type: [ItemDto] })
    @IsNotEmpty()
    @IsObject({ each: true })
    @ValidateNested({ each: true })
    @Type(() => ItemDto)
    items: Item[];
  }

  return DynamicListDto;
};
