"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const corsOrigins = process.env.NODE_ENV === "production"
        ? [process.env.FRONTEND_URL || "https://seu-frontend.com"]
        : ["http://localhost:5173", "http://localhost:5174"];
    app.enableCors({
        origin: corsOrigins,
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle("CompreFi API")
        .setDescription("API para gerenciamento de produtos Apple da CompreFi")
        .setVersion("2.0")
        .addBearerAuth()
        .addTag("Products", "Operações relacionadas a produtos")
        .addTag("Auth", "Operações de autenticação")
        .addTag("Users", "Operações relacionadas a usuários")
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup("api/docs", app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });
    const port = process.env.PORT || 3000;
    await app.listen(port, "0.0.0.0");
    console.log(`🚀 CompreFi API rodando em http://localhost:${port}`);
    console.log(`📚 Documentação Swagger disponível em http://localhost:${port}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map