import { ConfigModule } from '@nestjs/config';

export const authModuleConfig = ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: ['../../.env.local', '../../.env'],
});
