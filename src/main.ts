import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuração de CORS para permitir acesso do frontend
  app.enableCors({
    origin: true, // Permite qualquer origem em desenvolvimento
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  app.enableCors({
    origin: "http://localhost:5173", // porta do seu frontend
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
