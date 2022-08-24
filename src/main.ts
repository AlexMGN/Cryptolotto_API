import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 8080;

  await app.listen(port);

  console.log(`🚀 Cryptolotto API is running on: ${await app.getUrl()}`);
}
bootstrap();
