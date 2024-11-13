import { Method } from '@backend/common';
import { Controller, Get, Inject, Query } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ApiTags } from '@nestjs/swagger';
import { ContactServiceClient } from '@packages/grpc.nest';
import { plainToInstance } from 'class-transformer';
import { ContactDto } from 'common/dto/contact.dto';
import { ContactQueryDto } from 'modules/main/dto/contact.query.dto';
import { MAIN_CONTACT_SERVICE_CLIENT } from 'modules/main/main.constants';
import { catchError, map, Observable, throwError } from 'rxjs';

@ApiTags('main')
@Controller('main')
export class MainWebController {
  constructor(
    @Inject(MAIN_CONTACT_SERVICE_CLIENT)
    private readonly contactServiceClient: ContactServiceClient,
  ) {}

  @Get('contacts')
  @Method({ type: [ContactDto] })
  getContacts(@Query() query: ContactQueryDto): Observable<ContactDto[]> {
    return this.contactServiceClient.getMany({ query }).pipe(
      map((response) => response.items.map((item) => plainToInstance(ContactDto, item))),
      catchError((exception) => throwError(() => new RpcException(exception))),
    );
  }
}
