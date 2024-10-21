import { IntersectionType } from '@nestjs/swagger';
import {} from 'class-validator';
import { EntityDto } from 'dto/models/entity.dto';
import { Experience, ExperienceBase } from 'interfaces';

export class ExperienceBaseDto implements ExperienceBase {}

export class ExperienceDto extends IntersectionType(ExperienceBaseDto, EntityDto) implements Experience {}
