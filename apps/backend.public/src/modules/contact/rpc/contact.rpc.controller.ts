import { Controller, Inject } from '@nestjs/common';
import {
  PublicContactServiceController,
  PublicContactServiceControllerMethods,
  RpcContactList,
  RpcContactRequest,
} from '@packages/backend.transport/generated/public';
import { PUBLIC_SERVICE, ContactService } from 'modules/contact/service/contact.service';

@Controller()
@PublicContactServiceControllerMethods()
export class ContactRpcController implements PublicContactServiceController {
  constructor(@Inject(PUBLIC_SERVICE) private readonly publicService: ContactService) {}

  async getPublic(request: RpcContactRequest): Promise<RpcContactList> {
    return {
      items: await this.publicService.getPublicContacts(request.query),
    };
  }
}
