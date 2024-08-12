import { Controller, Get, Inject, Query } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ApiTags } from '@nestjs/swagger';
import { ContactDto, Method } from '@packages/backend.common';
import { PublicContactServiceClient } from '@packages/backend.transport/generated/public';
import { BackendTypedHttpSchema } from '@packages/common';
import { plainToInstance } from 'class-transformer';
import { RpcContactQueryDto } from 'modules/public/dto/contact.query.dto';
import { PUBLIC_CONTACT_SERVICE_CLIENT } from 'modules/public/public.constants';
import { catchError, map, Observable, throwError } from 'rxjs';

@ApiTags('public')
@Controller(BackendTypedHttpSchema.public.getUrl())
export class PublicWebController {
  constructor(
    @Inject(PUBLIC_CONTACT_SERVICE_CLIENT)
    private readonly publicContactServiceClient: PublicContactServiceClient,
  ) {}

  @Get(BackendTypedHttpSchema.public.endpoints.getContacts.getUrl())
  @Method({ type: [ContactDto] })
  getPublicContacts(@Query() query: RpcContactQueryDto): Observable<ContactDto[]> {
    return this.publicContactServiceClient.getPublic({ query }).pipe(
      map((response) => response.items.map((item) => plainToInstance(ContactDto, item))),
      catchError((exception) => throwError(() => new RpcException(exception))),
    );
  }
}
