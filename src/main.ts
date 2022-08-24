import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 8080;
  const host = configService.get<string>('HOST') || '127.0.0.1';

  await app.listen(port, host);

  console.log(`🚀 Cryptolotto API is running on: ${await app.getUrl()}`);
}
bootstrap();
