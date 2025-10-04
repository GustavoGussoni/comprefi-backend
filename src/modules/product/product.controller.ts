import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CalculatePricesDto } from './dto/calculate-prices.dto';
import { ApiBearerAuth, ApiQuery, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um novo produto' })
  @ApiResponse({ status: 201, description: 'Produto criado com sucesso' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@Body() createProductDto: CreateProductDto, @Request() req) {
    return this.productService.create(createProductDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os produtos' })
  @ApiQuery({
    name: 'category',
    type: String,
    required: false,
    description: 'Filtrar por categoria',
    example: 'iPhones Seminovos',
  })
  @ApiQuery({
    name: 'isNew',
    type: Boolean,
    required: false,
    description: 'Filtrar por produtos novos (true) ou seminovos (false)',
  })
  @ApiQuery({
    name: 'isActive',
    type: Boolean,
    required: false,
    description: 'Filtrar por produtos ativos',
    example: true,
  })
  @ApiQuery({
    name: 'groupBy',
    type: String,
    required: false,
    description: 'Agrupar resultados por campo específico',
    example: 'category',
  })
  @ApiResponse({ status: 200, description: 'Lista de produtos retornada com sucesso' })
  findAll(
    @Query('category') category?: string,
    @Query('isNew') isNew?: boolean,
    @Query('isActive') isActive?: boolean,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.productService.findAll({
      category,
      isNew,
      isActive,
      groupBy,
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar todas as categorias disponíveis' })
  @ApiResponse({ status: 200, description: 'Lista de categorias retornada com sucesso' })
  getCategories() {
    return this.productService.getCategories();
  }

  @Get('by-category/:categorySlug')
  @ApiOperation({ summary: 'Buscar produtos por slug da categoria' })
  @ApiResponse({ status: 200, description: 'Produtos da categoria retornados com sucesso' })
  findByCategory(@Param('categorySlug') categorySlug: string) {
    return this.productService.findByCategory(categorySlug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  @ApiResponse({ status: 200, description: 'Produto encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um produto' })
  @ApiResponse({ status: 200, description: 'Produto atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar um produto' })
  @ApiResponse({ status: 204, description: 'Produto deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }

  @Post('calculate-prices')
  @ApiOperation({ summary: 'Calcular preços baseado no custo' })
  @ApiResponse({ status: 200, description: 'Preços calculados com sucesso' })
  calculatePrices(@Body() calculatePricesDto: CalculatePricesDto) {
    return this.productService.calculatePrices(calculatePricesDto);
  }

  @Post('bulk-create')
  @ApiOperation({ summary: 'Criar múltiplos produtos em lote' })
  @ApiResponse({ status: 201, description: 'Produtos criados com sucesso' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  bulkCreate(@Body() createProductsDto: CreateProductDto[], @Request() req) {
    return this.productService.bulkCreate(createProductsDto, req.user.id);
  }

  @Post('sync-from-sheet')
  @ApiOperation({ summary: 'Sincronizar produtos a partir de planilha Google Sheets' })
  @ApiResponse({ status: 200, description: 'Sincronização realizada com sucesso' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  syncFromSheet(@Request() req) {
    return this.productService.syncFromGoogleSheets(req.user.id);
  }
}

