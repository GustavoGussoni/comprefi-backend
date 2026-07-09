import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins =
    process.env.NODE_ENV === "production"
      ? [
          "https://www.comprefi.com",
          "https://comprefi.com",
          "https://comprefi.com.br",
          "https://www.comprefi.com.br",
          ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
        ]
      : ["http://localhost:5173", "http://localhost:5174"];

  app.enableCors({
    origin: corsOrigins,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });
  // Configuração de validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Configuração do Swagger para documentação da API
  const config = new DocumentBuilder()
    .setTitle("CompreFi API")
    .setDescription("API para gerenciamento de produtos Apple da CompreFi")
    .setVersion("2.0")
    .addBearerAuth()
    .addTag("Products", "Operações relacionadas a produtos")
    .addTag("Auth", "Operações de autenticação")
    .addTag("Users", "Operações relacionadas a usuários")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Configuração da porta
  const port = process.env.PORT || 3000;

  // Bind em 0.0.0.0 para permitir acesso externo
  await app.listen(port, "0.0.0.0");

  console.log(`🚀 CompreFi API rodando em http://localhost:${port}`);
  console.log(
    `📚 Documentação Swagger disponível em http://localhost:${port}/api/docs`
  );
}

bootstrap();
