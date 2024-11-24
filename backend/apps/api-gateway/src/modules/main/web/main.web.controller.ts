import { ContactDto, ContactQueryDto, Method } from '@backend/common';
import { InjectGrpcService } from '@backend/transport';
import { Controller, Get, Query } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ApiTags } from '@nestjs/swagger';
import { CONTACT_SERVICE_NAME, ContactServiceClient } from '@packages/grpc.nest';
import { plainToInstance } from 'class-transformer';
import { catchError, map, Observable, throwError } from 'rxjs';

@ApiTags('main')
@Controller('main')
export class MainWebController {
  constructor(
    @InjectGrpcService(CONTACT_SERVICE_NAME)
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
