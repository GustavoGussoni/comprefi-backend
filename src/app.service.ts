import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): object {
    return {
      message: 'CompreFi API v2.0 - Funcionando!',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      description: 'API para gerenciamento de produtos Apple da CompreFi',
    };
  }

  getHealth(): object {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: 'connected', // Em uma implementação real, verificaria a conexão com o banco
      services: {
        prisma: 'connected',
        auth: 'active',
        products: 'active',
      },
    };
  }
}

