import { BaseQueryDto, TransformToBoolean } from '@backend/common';
import { GrpcInterceptor } from '@backend/transport';
import { BaseRpcContext } from '@nestjs/microservices';
import { RpcArgumentsHost } from '@nestjs/common/interfaces';
import { RpcParamtype } from '@nestjs/microservices/enums/rpc-paramtype.enum';
import { createPipesRpcParamDecorator } from '@nestjs/microservices/utils/param.utils';
import { ApiProperty } from '@nestjs/swagger';
import {
  ContactRequest,
  ContactList,
  ContactServiceControllerMethods,
  ContactServiceController,
  ContactQuery,
} from '@packages/grpc.nest';
import {
  ClassSerializerInterceptor,
  Controller,
  createParamDecorator,
  Inject,
  SerializeOptions,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  Type as CommonType,
} from '@nestjs/common';
import { plainToClass, plainToInstance, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  CONTACT_REPOSITORY,
  ContactRepository,
} from 'modules/contact/repository/contact.repository';

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

export class ContactRequestDto {
  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => ContactQueryDto)
  query123: ContactQueryDto;
}

const Test = createParamDecorator((dto: CommonType<any>, input: BaseRpcContext) => {
  const payload = (input as BaseRpcContext).getArgByIndex(0);
  return plainToInstance(dto, payload);
});

@Controller()
@ContactServiceControllerMethods()
@UseInterceptors(GrpcInterceptor)
export class ContactRpcController implements ContactServiceController {
  constructor(@Inject(CONTACT_REPOSITORY) private readonly contactRepository: ContactRepository) {}

  async getMany(@Test(ContactRequestDto) request: ContactRequest): Promise<ContactList> {
    console.log(request);
    return {
      items: await this.contactRepository.getMany(request.query),
    };
  }
}
