import { InjectModel } from '@nestjs/mongoose';
import { Contact } from 'interfaces';
import { MongoMapper } from 'mappers';
import { ContactRepository } from 'modules/persistence/contact/contact.repository';
import { Model } from 'mongoose';
import { MongoRepositoryImpl } from 'repositories';
import { ContactEntity } from 'schemas';

export class ContactRepositoryImpl
  extends MongoRepositoryImpl<ContactEntity, Contact>
  implements ContactRepository
{
  constructor(@InjectModel(ContactEntity.name) protected readonly model: Model<ContactEntity>) {
    super(model, new MongoMapper());
  }
}
