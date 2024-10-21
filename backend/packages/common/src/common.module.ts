import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnvValidator } from '@packages/environment';

export type CommonModuleOptions = {
  envValidator: EnvValidator;
};

@Module({})
export class CommonModule {
  static register(options: CommonModuleOptions): DynamicModule {
    return {
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validationSchema: options.envValidator.toJoiValidator(),
        }),
      ],
      exports: [ConfigModule],
      module: CommonModule,
    };
  }
}
