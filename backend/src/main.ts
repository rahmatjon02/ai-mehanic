import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Mechanic API')
    .setDescription(
      'Backend API for diagnosis, quote comparison, prices, and history.',
    )
    .setVersion('1.0.0')
    .addServer('/')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  const appUrl = await app.getUrl();
  const publicAppUrl = appUrl
    .replace('[::1]', 'localhost')
    .replace('0.0.0.0', 'localhost');
  const swaggerUrl = new URL('/api-docs', publicAppUrl).toString();

  console.log('');
  console.log(`Backend URL: ${publicAppUrl}`);
  console.log(`Swagger URL: ${swaggerUrl}`);
}
bootstrap();
