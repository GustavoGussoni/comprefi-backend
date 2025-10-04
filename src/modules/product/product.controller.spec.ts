// src/modules/product/product.controller.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { ProductController } from "./product.controller";
import { ProductService } from "./product.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

describe("ProductController", () => {
  let controller: ProductController;
  let productService: ProductService;

  const mockProductService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    calculatePrices: jest.fn(),
    getCategories: jest.fn(),
    findByCategory: jest.fn(),
    bulkCreate: jest.fn(),
    syncFromGoogleSheets: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<ProductController>(ProductController);
    productService = module.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("calculatePrices", () => {
    it("deve calcular preços corretamente", async () => {
      const mockCalculatedPrices = {
        pixPrice: "R$ 5111,11",
        installmentPrice: "R$ 492,59",
        originalPrice: "R$ 5476,19",
        rawValues: {
          pixPrice: 5111.11,
          installmentPrice: 492.59,
          originalPrice: 5476.19,
        },
      };

      mockProductService.calculatePrices.mockResolvedValue(
        mockCalculatedPrices
      );

      const calculatePricesDto = {
        cost: 4500,
        freight: 100,
      };

      const result = await controller.calculatePrices(calculatePricesDto);

      expect(productService.calculatePrices).toHaveBeenCalledWith(
        calculatePricesDto
      );
      expect(result).toEqual(mockCalculatedPrices);
    });

    it("deve calcular preços para Macbook com frete especial", async () => {
      const mockCalculatedPrices = {
        pixPrice: "R$ 9133,33",
        installmentPrice: "R$ 879,17",
        originalPrice: "R$ 9785,71",
        rawValues: {
          pixPrice: 9133.33,
          installmentPrice: 879.17,
          originalPrice: 9785.71,
        },
      };

      mockProductService.calculatePrices.mockResolvedValue(
        mockCalculatedPrices
      );

      const calculatePricesDto = {
        cost: 8000,
        freight: 100,
        category: "Macbooks",
      };

      const result = await controller.calculatePrices(calculatePricesDto);

      expect(productService.calculatePrices).toHaveBeenCalledWith(
        calculatePricesDto
      );
      expect(result).toEqual(mockCalculatedPrices);
    });
  });

  describe("findAll", () => {
    it("deve retornar lista de produtos com filtros", async () => {
      const mockProducts = [
        {
          id: "1",
          model: "iPhone 15 Pro",
          category: "iPhones Novos",
          isActive: true,
          isNew: true,
        },
        {
          id: "2",
          model: "MacBook Pro M4",
          category: "Macbooks",
          isActive: true,
          isNew: true,
        },
      ];

      mockProductService.findAll.mockResolvedValue(mockProducts);

      const result = await controller.findAll("iPhones Novos", true, true);

      expect(productService.findAll).toHaveBeenCalledWith({
        category: "iPhones Novos",
        isNew: true,
        isActive: true,
        groupBy: undefined,
      });
      expect(result).toEqual(mockProducts);
    });

    it("deve retornar produtos agrupados por categoria", async () => {
      const mockGroupedProducts = {
        "iPhones Novos": [
          { id: "1", model: "iPhone 15 Pro", category: "iPhones Novos" },
        ],
        Macbooks: [{ id: "2", model: "MacBook Pro M4", category: "Macbooks" }],
      };

      mockProductService.findAll.mockResolvedValue(mockGroupedProducts);

      const result = await controller.findAll(
        undefined,
        undefined,
        true,
        "category"
      );

      expect(productService.findAll).toHaveBeenCalledWith({
        category: undefined,
        isNew: undefined,
        isActive: true,
        groupBy: "category",
      });
      expect(result).toEqual(mockGroupedProducts);
    });
  });

  describe("findOne", () => {
    it("deve retornar produto por ID", async () => {
      const mockProduct = {
        id: "1",
        model: "iPhone 15 Pro",
        storage: "256GB",
        color: "Titânio Natural",
        battery: "100%",
        pixPrice: "R$ 8500,00",
        category: "iPhones Novos",
      };

      mockProductService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne("1");

      expect(productService.findOne).toHaveBeenCalledWith("1");
      expect(result).toEqual(mockProduct);
    });
  });

  describe("getCategories", () => {
    it("deve retornar lista de categorias", async () => {
      const mockCategories = [
        "iPhones Novos",
        "iPhones Seminovos",
        "Macbooks",
        "iPads",
        "Apple Watch",
        "Acessórios",
      ];

      mockProductService.getCategories.mockResolvedValue(mockCategories);

      const result = await controller.getCategories();

      expect(productService.getCategories).toHaveBeenCalled();
      expect(result).toEqual(mockCategories);
    });
  });

  describe("findByCategory", () => {
    it("deve retornar produtos por slug da categoria", async () => {
      const mockProducts = [
        {
          id: "1",
          model: "iPhone 15 Pro",
          category: "iPhones Novos",
        },
        {
          id: "2",
          model: "iPhone 15",
          category: "iPhones Novos",
        },
      ];

      mockProductService.findByCategory.mockResolvedValue(mockProducts);

      const result = await controller.findByCategory("iphones-novos");

      expect(productService.findByCategory).toHaveBeenCalledWith(
        "iphones-novos"
      );
      expect(result).toEqual(mockProducts);
    });
  });

  describe("create", () => {
    it("deve criar produto com usuário autenticado", async () => {
      const mockProduct = {
        id: "1",
        model: "iPhone 15 Pro",
        storage: "256GB",
        color: "Titânio Natural",
        category: "iPhones Novos",
      };

      const createProductDto = {
        model: "iPhone 15 Pro",
        storage: "256GB",
        color: "Titânio Natural",
        battery: "100%",
        originalPrice: "R$ 8.500,00",
        installmentPrice: "R$ 650,00",
        pixPrice: "R$ 7.800,00",
        details: "Produto de teste",
        category: "iPhones Novos",
        specs: "Especificações de teste",
        cost: 7000,
        freight: 100,
        isNew: true,
        isActive: true,
      };

      const mockRequest = {
        user: { id: "user-123" },
      };

      mockProductService.create.mockResolvedValue(mockProduct);

      const result = await controller.create(createProductDto, mockRequest);

      expect(productService.create).toHaveBeenCalledWith(
        createProductDto,
        "user-123"
      );
      expect(result).toEqual(mockProduct);
    });
  });
});
