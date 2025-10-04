import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CalculatePricesDto } from './dto/calculate-prices.dto';
import { ProductsRepository } from './repositories/product.repository';
import { PriceCalculatorService } from './services/price-calculator.service';

interface FindAllFilters {
  category?: string;
  isNew?: boolean;
  isActive?: boolean;
  groupBy?: string;
}

@Injectable()
export class ProductService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly priceCalculatorService: PriceCalculatorService,
  ) {}

  async create(createProductDto: CreateProductDto, userId: string) {
    // Se foi fornecido custo, calcula os preços automaticamente
    if (createProductDto.cost) {
      const calculatedPrices = await this.priceCalculatorService.calculateProductPrices(
        createProductDto.cost,
        createProductDto.freight || 100,
      );

      // Sobrescreve os preços com os valores calculados se não foram fornecidos
      if (!createProductDto.pixPrice) {
        createProductDto.pixPrice = calculatedPrices.pixPrice;
      }
      if (!createProductDto.installmentPrice) {
        createProductDto.installmentPrice = calculatedPrices.installmentPrice;
      }
      if (!createProductDto.originalPrice) {
        createProductDto.originalPrice = calculatedPrices.originalPrice;
      }
    }

    return this.productsRepository.create(createProductDto, userId);
  }

  async findAll(filters: FindAllFilters = {}) {
    return this.productsRepository.findAll(filters);
  }

  async findOne(id: string) {
    const product = await this.productsRepository.findOne(id);
    if (!product) {
      throw new NotFoundException('Produto não encontrado!');
    }
    return product;
  }

  async findByCategory(categorySlug: string) {
    return this.productsRepository.findByCategory(categorySlug);
  }

  async getCategories() {
    return this.productsRepository.getCategories();
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const existingProduct = await this.productsRepository.findOne(id);
    if (!existingProduct) {
      throw new NotFoundException('Produto não encontrado!');
    }

    // Se foi fornecido custo, recalcula os preços automaticamente
    if (updateProductDto.cost) {
      const calculatedPrices = await this.priceCalculatorService.calculateProductPrices(
        updateProductDto.cost,
        updateProductDto.freight || existingProduct.freight || 100,
      );

      // Atualiza os preços apenas se não foram fornecidos explicitamente
      if (!updateProductDto.pixPrice) {
        updateProductDto.pixPrice = calculatedPrices.pixPrice;
      }
      if (!updateProductDto.installmentPrice) {
        updateProductDto.installmentPrice = calculatedPrices.installmentPrice;
      }
      if (!updateProductDto.originalPrice) {
        updateProductDto.originalPrice = calculatedPrices.originalPrice;
      }
    }

    return this.productsRepository.update(updateProductDto, id);
  }

  async remove(id: string) {
    const existingProduct = await this.productsRepository.findOne(id);
    if (!existingProduct) {
      throw new NotFoundException('Produto não encontrado!');
    }

    await this.productsRepository.delete(id);
  }

  async calculatePrices(calculatePricesDto: CalculatePricesDto) {
    return this.priceCalculatorService.calculatePrices(calculatePricesDto);
  }

  async bulkCreate(createProductsDto: CreateProductDto[], userId: string) {
    const results = [];
    
    for (const productDto of createProductsDto) {
      try {
        const product = await this.create(productDto, userId);
        results.push({ success: true, product });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message, 
          productData: productDto 
        });
      }
    }

    return {
      total: createProductsDto.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  async syncFromGoogleSheets(userId: string) {
    // Esta funcionalidade será implementada para sincronizar com Google Sheets
    // Por enquanto, retorna uma mensagem indicando que está em desenvolvimento
    return {
      message: 'Funcionalidade de sincronização com Google Sheets em desenvolvimento',
      status: 'pending_implementation',
    };
  }

  /**
   * Método para popular o banco com os dados mockados do frontend
   * Útil para migração inicial dos dados
   */
  async seedFromFrontendData(userId: string) {
    // Dados mockados do frontend (exemplo com alguns produtos)
    const frontendProducts = [
      {
        model: "iPhone 15 Pro Max",
        storage: "256GB",
        color: "Titânio Natural",
        battery: "89%",
        originalPrice: "R$ 6.590,00",
        installmentPrice: "R$ 540,67",
        pixPrice: "R$ 5.690",
        details: "sem detalhes | garantia Apple até junho",
        category: "iPhones Seminovos",
        specs: 'Tela Super Retina XDR de 6,7", chip A17 Pro, câmera tripla de 48MP, 256GB de armazenamento',
        isNew: false,
        realImages: [],
      },
      {
        model: "iPhone 16 Pro Max",
        storage: "(1TB)",
        color: "Titânio Preto, Titânio Cinza/Natural, Titânio Branco, Titânio Deserto",
        battery: "100%",
        originalPrice: "R$ 14445.35",
        installmentPrice: "R$ 1160",
        pixPrice: "R$ 12.039",
        details: "aparelho novo",
        category: "iPhones Novos",
        specs: 'Tela ~6.9", Chip A18 Pro, Câmera Ultra Wide 48MP, Zoom Óptico 5x, Wi-Fi 7, Botão de Captura, Bateria ~4676 mAh (Rumor)',
        isNew: true,
        realImages: [],
      },
      // Adicionar mais produtos conforme necessário
    ];

    const results = [];
    for (const productData of frontendProducts) {
      try {
        const product = await this.create(productData as CreateProductDto, userId);
        results.push({ success: true, product });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message, 
          productData 
        });
      }
    }

    return {
      message: 'Seed de dados do frontend executado',
      total: frontendProducts.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }
}

