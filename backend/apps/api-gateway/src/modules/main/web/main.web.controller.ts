import { ContactDto, Method } from '@backend/common';
import { Controller, Get, Inject, Query } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ApiTags } from '@nestjs/swagger';
import { BackendTypedHttpSchema } from '@packages/common';
import { ContactServiceClient } from '@packages/grpc.nest';
import { plainToInstance } from 'class-transformer';
import { RpcContactQueryDto } from 'modules/main/dto/contact.query.dto';
import { MAIN_CONTACT_SERVICE_CLIENT } from 'modules/main/main.constants';
import { catchError, map, Observable, throwError } from 'rxjs';

@ApiTags('main')
@Controller(BackendTypedHttpSchema.main.getUrl())
export class MainWebController {
  constructor(
    @Inject(MAIN_CONTACT_SERVICE_CLIENT)
    private readonly contactServiceClient: ContactServiceClient,
  ) {}

  @Get(BackendTypedHttpSchema.main.endpoints.getContacts.getUrl())
  @Method({ type: [ContactDto] })
  getContacts(@Query() query: RpcContactQueryDto): Observable<ContactDto[]> {
    return this.contactServiceClient.getMany({ query }).pipe(
      map((response) => response.items.map((item) => plainToInstance(ContactDto, item))),
      catchError((exception) => throwError(() => new RpcException(exception))),
    );
  }
}
