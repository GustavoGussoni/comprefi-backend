import { Injectable } from "@nestjs/common";
import { PrismaService } from "./database/prisma.service";

interface HealthStatus {
  status: "healthy" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  database: "connected" | "disconnected";
  services: {
    prisma: "connected" | "disconnected";
    auth: "active";
    products: "active";
  };
}

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): object {
    return {
      message: "CompreFi API v2.0 - Funcionando!",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      description: "API para gerenciamento de produtos Apple da CompreFi",
    };
  }

  async getHealth(): Promise<HealthStatus> {
    let database: HealthStatus["database"] = "connected";

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "disconnected";
    }

    return {
      status: database === "connected" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "2.0.0",
      environment: process.env.NODE_ENV || "development",
      database,
      services: {
        prisma: database,
        auth: "active",
        products: "active",
      },
    };
  }
}
