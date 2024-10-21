import { IntersectionType } from '@nestjs/swagger';
import {} from 'class-validator';
import { EntityDto } from 'dto/models/entity.dto';
import { User, UserBase } from 'interfaces';

export class UserBaseDto implements UserBase {}

export class UserDto extends IntersectionType(UserBaseDto, EntityDto) implements User {}
