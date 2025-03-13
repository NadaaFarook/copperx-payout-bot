import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  try {
    const app = await NestFactory.create(AppModule);

    // Apply global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );

    // Enable CORS
    app.enableCors();

    // Start the application
    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`Application is running on: http://localhost:${port}`);
  } catch (error) {
    logger.error(`Failed to start application: ${error.message}`);
    process.exit(1);
  }
}

bootstrap();
