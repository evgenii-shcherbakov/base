import { MongoMapper, MongoRepositoryImpl } from '@backend/persistence';
import { InjectModel } from '@nestjs/mongoose';
import { Contact } from '@packages/grpc.nest';
import { ContactEntity } from 'common/entities/contact.entity';
import { ContactRepository } from 'modules/contact/repository/contact.repository';
import { Model } from 'mongoose';

export class ContactRepositoryImpl
  extends MongoRepositoryImpl<ContactEntity, Contact>
  implements ContactRepository
{
  constructor(@InjectModel(ContactEntity.name) protected readonly model: Model<ContactEntity>) {
    super(model, new MongoMapper());
  }
}
