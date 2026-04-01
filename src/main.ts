import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { config } from './infrastructure/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const swaggerServerUrl = process.env.SWAGGER_SERVER_URL || '/';

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  app.enableCors();

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new AppZodValidationPipe());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Onboarding BE API')
    .setDescription('Dokumentasi API untuk onboarding backend')
    .setVersion('1.0.0')
    .addServer(swaggerServerUrl)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const rawDocument = SwaggerModule.createDocument(app, swaggerConfig);
  const document = cleanupOpenApiDoc(rawDocument);

  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
    },
    customSiteTitle: 'Onboarding BE API Docs',
  });

  await app.listen(parseInt(config.app.port, 10));
}
void bootstrap();
