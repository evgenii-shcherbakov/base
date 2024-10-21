import {
  ContactServiceControllerMethods,
  ContactServiceController,
  RpcContactRequest,
  RpcContactList,
} from '@packages/grpc.nest';
import { Controller, Inject } from '@nestjs/common';
import { PUBLIC_SERVICE, ContactService } from 'modules/contact/service/contact.service';

@Controller()
@ContactServiceControllerMethods()
export class ContactRpcController implements ContactServiceController {
  constructor(@Inject(PUBLIC_SERVICE) private readonly publicService: ContactService) {}

  async getMany(request: RpcContactRequest): Promise<RpcContactList> {
    return {
      items: await this.publicService.getPublicContacts(request.query),
    };
  }
}
