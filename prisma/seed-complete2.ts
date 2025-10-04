import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed completo do banco de dados...");

  // Criar usuário padrão
  const hashedPassword = await bcrypt.hash("123456", 10);

  const user = await prisma.user.upsert({
    where: { email: "admin@comprefi.com" },
    update: {},
    create: {
      name: "Admin CompreFi",
      email: "admin@comprefi.com",
      password: hashedPassword,
    },
  });

  console.log("👤 Usuário admin criado:", user.email);

  // Criar configuração de preços padrão
  const priceConfig = await prisma.priceConfig.upsert({
    where: { name: "default" },
    update: {},
    create: {
      name: "default",
      freightValue: 100,
      pixMultiplier: 0.9,
      installmentDiv1: 0.8651,
      installmentDiv2: 12,
      originalPricePerc: 1.2,
    },
  });

  console.log("💰 Configuração de preços criada:", priceConfig.name);

  // Limpar produtos existentes
  await prisma.product.deleteMany({});
  console.log("🗑️ Produtos existentes removidos");

  // Produtos completos baseados na lista do frontend
  const allProducts = [
    // iPhones Seminovos
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
      specs:
        'Tela Super Retina XDR de 6,7", chip A17 Pro, câmera tripla de 48MP, 256GB de armazenamento',
      isNew: false,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 15",
      storage: "256GB",
      color: "Preto",
      battery: "90%",
      originalPrice: "R$ 5.190,00",
      installmentPrice: "R$ 379,13",
      pixPrice: "R$ 3.990",
      details: "*pequeno detalhe na lateral",
      category: "iPhones Seminovos",
      specs:
        'Tela Super Retina XDR de 6,1", chip A16 Bionic, câmera dupla de 48MP, 256GB de armazenamento',
      isNew: false,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 14 Pro Max",
      storage: "512GB",
      color: "Preto",
      battery: "81%",
      originalPrice: "R$ 5.900,00",
      installmentPrice: "R$ 465,60",
      pixPrice: "R$ 4.900",
      details: "*detalhes de capinha na borda",
      category: "iPhones Seminovos",
      specs:
        'Tela Super Retina XDR de 6,7", chip A16 Bionic, câmera tripla de 48MP, 512GB de armazenamento',
      isNew: false,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 14 Pro Max",
      storage: "256GB",
      color: "Roxo",
      battery: "87%",
      originalPrice: "R$ 5.300,00",
      installmentPrice: "R$ 441,85",
      pixPrice: "R$ 4.650",
      details: "*detalhe na lateral",
      category: "iPhones Seminovos",
      specs:
        'Tela Super Retina XDR de 6,7", chip A16 Bionic, câmera tripla de 48MP, 256GB de armazenamento',
      isNew: false,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 12 Pro",
      storage: "128GB",
      color: "Dourado",
      battery: "78%",
      originalPrice: "R$ 2.700,00",
      installmentPrice: "R$ 189,09",
      pixPrice: "R$ 1.990",
      details: "sem detalhes",
      category: "iPhones Seminovos",
      specs:
        'Tela Super Retina XDR de 6,1", chip A14 Bionic, câmera tripla de 12MP, 128GB de armazenamento',
      isNew: false,
      realImages: [],
      userId: user.id,
    },

    // iPhones Novos
    {
      model: "iPhone 16 Pro Max",
      storage: "(1TB)",
      color:
        "Titânio Preto, Titânio Cinza/Natural, Titânio Branco, Titânio Deserto",
      battery: "100%",
      originalPrice: "R$ 14445.35",
      installmentPrice: "R$ 1160",
      pixPrice: "R$ 12.039",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela ~6.9", Chip A18 Pro, Câmera Ultra Wide 48MP, Zoom Óptico 5x, Wi-Fi 7, Botão de Captura, Bateria ~4676 mAh (Rumor)',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 16 Pro",
      storage: "(1TB)",
      color:
        "Titânio Preto, Titânio Cinza/Natural, Titânio Branco, Titânio Deserto",
      battery: "100%",
      originalPrice: "R$ 13015.93",
      installmentPrice: "R$ 1061",
      pixPrice: "R$ 11.017",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela ~6.3", Chip A18 Pro, Câmera Ultra Wide 48MP, Zoom Óptico 5x, Wi-Fi 7, Botão de Captura, Bateria ~3355 mAh (Rumor)',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 16 Pro Max",
      storage: "(512GB)",
      color:
        "Titânio Preto, Titânio Cinza/Natural, Titânio Branco, Titânio Deserto",
      battery: "100%",
      originalPrice: "R$ 12374.76",
      installmentPrice: "R$ 1023",
      pixPrice: "R$ 10.619",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela ~6.9", Chip A18 Pro, Câmera Ultra Wide 48MP, Zoom Óptico 5x, Wi-Fi 7, Botão de Captura, Bateria ~4676 mAh (Rumor)',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 16 Pro",
      storage: "(512GB)",
      color:
        "Titânio Preto, Titânio Cinza/Natural, Titânio Branco, Titânio Deserto",
      battery: "100%",
      originalPrice: "R$ 10692.95",
      installmentPrice: "R$ 881",
      pixPrice: "R$ 9.142",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela ~6.3", Chip A18 Pro, Câmera Ultra Wide 48MP, Zoom Óptico 5x, Wi-Fi 7, Botão de Captura, Bateria ~3355 mAh (Rumor)',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 15 Pro Max",
      storage: "(512GB)",
      color: "Titânio Preto, Titânio Branco, Titânio Azul, Titânio Natural",
      battery: "100%",
      originalPrice: "R$ 9527.68",
      installmentPrice: "R$ 826",
      pixPrice: "R$ 8.573",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela Super Retina XDR 6.7", Chip A17 Pro, Câmera Tripla 48MP, USB-C (USB 3), Titânio, Botão de Ação',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 16 Pro Max",
      storage: "(256GB)",
      color:
        "Titânio Preto, Titânio Cinza/Natural, Titânio Branco, Titânio Deserto",
      battery: "100%",
      originalPrice: "R$ 9386.00",
      installmentPrice: "R$ 765",
      pixPrice: "R$ 7.937",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela ~6.9", Chip A18 Pro, Câmera Ultra Wide 48MP, Zoom Óptico 5x, Wi-Fi 7, Botão de Captura, Bateria ~4676 mAh (Rumor)',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 16 Pro",
      storage: "(256GB)",
      color:
        "Titânio Preto, Titânio Cinza/Natural, Titânio Branco, Titânio Deserto",
      battery: "100%",
      originalPrice: "R$ 8415.00",
      installmentPrice: "R$ 710",
      pixPrice: "R$ 7.369",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela ~6.3", Chip A18 Pro, Câmera Ultra Wide 48MP, Zoom Óptico 5x, Wi-Fi 7, Botão de Captura, Bateria ~3355 mAh (Rumor)',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 16 Plus",
      storage: "(256GB)",
      color: "Preto, Branco, Rosa, Teal, Ultramarino",
      battery: "100%",
      originalPrice: "R$ 8206.89",
      installmentPrice: "R$ 705",
      pixPrice: "R$ 7.323",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela 6.7", Chip A18, Câmera 48MP Fusion, Botão de Ação, Botão de Captura, USB-C (Rumor/Preliminar)',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 16 Pro",
      storage: "(128GB)",
      color:
        "Titânio Preto, Titânio Cinza/Natural, Titânio Branco, Titânio Deserto",
      battery: "100%",
      originalPrice: "R$ 7580.61",
      installmentPrice: "R$ 644",
      pixPrice: "R$ 6.687",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela ~6.3", Chip A18 Pro, Câmera Ultra Wide 48MP, Zoom Óptico 5x, Wi-Fi 7, Botão de Captura, Bateria ~3355 mAh (Rumor)',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 16 Plus",
      storage: "(128GB)",
      color: "Preto, Branco, Rosa, Teal, Ultramarino",
      battery: "100%",
      originalPrice: "R$ 7558.18",
      installmentPrice: "R$ 634",
      pixPrice: "R$ 6.585",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela 6.7", Chip A18, Câmera 48MP Fusion, Botão de Ação, Botão de Captura, USB-C (Rumor/Preliminar)',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 16",
      storage: "(256GB)",
      color: "Preto, Branco, Rosa, Teal, Ultramarino",
      battery: "100%",
      originalPrice: "R$ 7295.39",
      installmentPrice: "R$ 618",
      pixPrice: "R$ 6.414",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela 6.1", Chip A18, Câmera 48MP Fusion, Botão de Ação, Botão de Captura, USB-C (Rumor/Preliminar)',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 15",
      storage: "(256GB)",
      color: "Rosa, Amarelo, Verde, Azul, Preto",
      battery: "100%",
      originalPrice: "R$ 6994.64",
      installmentPrice: "R$ 563",
      pixPrice: "R$ 5.846",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela Super Retina XDR 6.1", Chip A16 Bionic, Câmera Dupla 48MP, Dynamic Island, USB-C (USB 2)',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 16",
      storage: "(128GB)",
      color: "Preto, Branco, Rosa, Teal, Ultramarino",
      battery: "100%",
      originalPrice: "R$ 6417.93",
      installmentPrice: "R$ 519",
      pixPrice: "R$ 5.392",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela 6.1", Chip A18, Câmera 48MP Fusion, Botão de Ação, Botão de Captura, USB-C (Rumor/Preliminar)',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 15",
      storage: "(128GB)",
      color: "Rosa, Amarelo, Verde, Azul, Preto",
      battery: "100%",
      originalPrice: "R$ 5436.39",
      installmentPrice: "R$ 468",
      pixPrice: "R$ 4.857",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela Super Retina XDR 6.1", Chip A16 Bionic, Câmera Dupla 48MP, Dynamic Island, USB-C (USB 2)',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 16e",
      storage: "(128GB)",
      color: "Preto, Branco, Rosa, Teal, Ultramarino",
      battery: "100%",
      originalPrice: "R$ 4937.87",
      installmentPrice: "R$ 399",
      pixPrice: "R$ 4.142",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela 6.1", Chip A18, Câmera 48MP Fusion, Botão de Ação, Botão de Captura, USB-C (Rumor/Preliminar)',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 14",
      storage: "(128GB)",
      color: "Meia-noite, Roxo, Estelar,RED, Azul, Amarelo",
      battery: "100%",
      originalPrice: "R$ 4716.15",
      installmentPrice: "R$ 410",
      pixPrice: "R$ 4.255",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela Super Retina XDR 6.1", Chip A15 Bionic (GPU 5-core), Câmera Dupla 12MP, Detecção de Acidente',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 13",
      storage: "(128GB)",
      color: "RED, Estelar, Meia-noite, Azul, Rosa, Verde",
      battery: "100%",
      originalPrice: "R$ 4120.38",
      installmentPrice: "R$ 344",
      pixPrice: "R$ 3.573",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela Super Retina XDR 6.1", Chip A15 Bionic (GPU 4-core), Câmera Dupla 12MP, Modo Cinema',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 11",
      storage: "(128GB)",
      color: "Preto, Verde, Amarelo, Roxo,RED, Branco",
      battery: "100%",
      originalPrice: "R$ 3546.81",
      installmentPrice: "R$ 297",
      pixPrice: "R$ 3.085",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela Liquid Retina HD LCD 6.1", Chip A13 Bionic, Câmera Dupla 12MP, Modo Noite',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 12",
      storage: "(64GB)",
      color: "Preto, Branco,RED, Verde, Azul, Roxo",
      battery: "100%",
      originalPrice: "R$ 3551.58",
      installmentPrice: "R$ 289",
      pixPrice: "R$ 3.005",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela Super Retina XDR OLED 6.1", Chip A14 Bionic, Câmera Dupla 12MP, 5G, Ceramic Shield',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: "iPhone 11",
      storage: "(64GB)",
      color: "Preto, Verde, Amarelo, Roxo,RED, Branco",
      battery: "100%",
      originalPrice: "R$ 2921.77",
      installmentPrice: "R$ 249",
      pixPrice: "R$ 2.585",
      details: "aparelho novo",
      category: "iPhones Novos",
      specs:
        'Tela Liquid Retina HD LCD 6.1", Chip A13 Bionic, Câmera Dupla 12MP, Modo Noite',
      isNew: true,
      realImages: [],
      userId: user.id,
    },

    // Macbooks
    {
      model: 'MacBook Pro 16" M4 Max',
      storage: "(48GB RAM / 1TB SSD)",
      color: "Prata, Preto-espacial",
      battery: "100%",
      originalPrice: "R$ 37.014,06",
      installmentPrice: "12x R$ 3.151,00",
      pixPrice: "R$ 32.712,00",
      details: "aparelho novo",
      category: "Macbooks",
      specs:
        'Tela Liquid Retina XDR 16.2", Chip M4 Max (14/16-core CPU, 32/40-core GPU), 3x Thunderbolt 5, HDMI, SDXC, MagSafe 3, Wi-Fi 6E',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: 'MacBook Pro 16" M4 Max',
      storage: "(36GB RAM / 1TB SSD)",
      color: "Prata, Preto-espacial",
      battery: "100%",
      originalPrice: "R$ 35.063,34",
      installmentPrice: "12x R$ 2.823,00",
      pixPrice: "R$ 29.303,00",
      details: "aparelho novo",
      category: "Macbooks",
      specs:
        'Tela Liquid Retina XDR 16.2", Chip M4 Max (14/16-core CPU, 32/40-core GPU), 3x Thunderbolt 5, HDMI, SDXC, MagSafe 3, Wi-Fi 6E',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: 'MacBook Pro 14" M4 Max',
      storage: "(36GB RAM / 1TB SSD)",
      color: "Prata, Preto-espacial",
      battery: "100%",
      originalPrice: "R$ 377,44",
      installmentPrice: "12x R$ 031,00",
      pixPrice: "R$ 326,00",
      details: "aparelho novo",
      category: "Macbooks",
      specs:
        'Tela Liquid Retina XDR 14.2", Chip M4 Max (14/16-core CPU, 32/40-core GPU), 3x Thunderbolt 5, HDMI, SDXC, MagSafe 3, Wi-Fi 6E',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: 'MacBook Pro 16" M4 Pro',
      storage: "(48GB RAM / 512GB SSD)",
      color: "Prata, Preto-espacial",
      battery: "100%",
      originalPrice: "R$ 363,27",
      installmentPrice: "12x R$ 031,00",
      pixPrice: "R$ 326,00",
      details: "aparelho novo",
      category: "Macbooks",
      specs:
        'Tela Liquid Retina XDR 16.2", Chip M4 Pro (14-core CPU, 20-core GPU), 3x Thunderbolt 5, HDMI, SDXC, MagSafe 3, Wi-Fi 6E',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: 'MacBook Pro 16" M4 Pro',
      storage: "(24GB RAM / 512GB SSD)",
      color: "Prata, Preto-espacial",
      battery: "100%",
      originalPrice: "R$ 23.928,42",
      installmentPrice: "12x R$ 1.985,00",
      pixPrice: "R$ 20.610,00",
      details: "aparelho novo",
      category: "Macbooks",
      specs:
        'Tela Liquid Retina XDR 16.2", Chip M4 Pro (14-core CPU, 20-core GPU), 3x Thunderbolt 5, HDMI, SDXC, MagSafe 3, Wi-Fi 6E',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: 'MacBook Pro 14" M4',
      storage: "(24GB RAM / 1TB SSD)",
      color: "Prata, Preto-espacial",
      battery: "100%",
      originalPrice: "R$ 22.252,98",
      installmentPrice: "12x R$ 1.832,00",
      pixPrice: "R$ 19.019,00",
      details: "aparelho novo",
      category: "Macbooks",
      specs:
        'Tela Liquid Retina XDR 14.2", Chip M4 (10-core CPU, 10-core GPU), 3x Thunderbolt 4, HDMI, SDXC, MagSafe 3, Wi-Fi 6E',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: 'MacBook Pro 14" M4 Pro',
      storage: "(24GB RAM / 512GB SSD)",
      color: "Prata, Preto-espacial",
      battery: "100%",
      originalPrice: "R$ 21.282,26",
      installmentPrice: "12x R$ 1.753,00",
      pixPrice: "R$ 18.209,00",
      details: "aparelho novo",
      category: "Macbooks",
      specs:
        'Tela Liquid Retina XDR 14.2", Chip M4 Pro (14-core CPU, 20-core GPU), 3x Thunderbolt 5, HDMI, SDXC, MagSafe 3, Wi-Fi 6E',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: 'MacBook Air 15" M3',
      storage: "(16GB RAM / 512GB SSD)",
      color: "Meia-noite, Estelar, Prata, Cinza-espacial",
      battery: "100%",
      originalPrice: "R$ 17.020,00",
      installmentPrice: "12x R$ 1.403,00",
      pixPrice: "R$ 14.573,00",
      details: "aparelho novo",
      category: "Macbooks",
      specs:
        'Tela Liquid Retina 15.3", Chip M3 (8-core CPU, 10-core GPU), 2x Thunderbolt / USB 4, MagSafe 3, Wi-Fi 6E',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: 'MacBook Air 13" M3',
      storage: "(16GB RAM / 512GB SSD)",
      color: "Meia-noite, Estelar, Prata, Cinza-espacial",
      battery: "100%",
      originalPrice: "R$ 15.069,28",
      installmentPrice: "12x R$ 1.241,00",
      pixPrice: "R$ 12.862,00",
      details: "aparelho novo",
      category: "Macbooks",
      specs:
        'Tela Liquid Retina 13.6", Chip M3 (8-core CPU, 10-core GPU), 2x Thunderbolt / USB 4, MagSafe 3, Wi-Fi 6E',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: 'MacBook Air 15" M3',
      storage: "(8GB RAM / 256GB SSD)",
      color: "Meia-noite, Estelar, Prata, Cinza-espacial",
      battery: "100%",
      originalPrice: "R$ 13.118,56",
      installmentPrice: "12x R$ 1.080,00",
      pixPrice: "R$ 11.209,00",
      details: "aparelho novo",
      category: "Macbooks",
      specs:
        'Tela Liquid Retina 15.3", Chip M3 (8-core CPU, 10-core GPU), 2x Thunderbolt / USB 4, MagSafe 3, Wi-Fi 6E',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: 'MacBook Air 13" M3',
      storage: "(8GB RAM / 256GB SSD)",
      color: "Meia-noite, Estelar, Prata, Cinza-espacial",
      battery: "100%",
      originalPrice: "R$ 11.167,84",
      installmentPrice: "12x R$ 919,00",
      pixPrice: "R$ 9.556,00",
      details: "aparelho novo",
      category: "Macbooks",
      specs:
        'Tela Liquid Retina 13.6", Chip M3 (8-core CPU, 10-core GPU), 2x Thunderbolt / USB 4, MagSafe 3, Wi-Fi 6E',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
    {
      model: 'MacBook Air 13" M2',
      storage: "(8GB RAM / 256GB SSD)",
      color: "Meia-noite, Estelar, Prata, Cinza-espacial",
      battery: "100%",
      originalPrice: "R$ 9.854,00",
      installmentPrice: "12x R$ 811,00",
      pixPrice: "R$ 8.415,00",
      details: "aparelho novo",
      category: "Macbooks",
      specs:
        'Tela Liquid Retina 13.6", Chip M2 (8-core CPU, 8-core GPU), 2x Thunderbolt / USB 4, MagSafe 3, Wi-Fi 6',
      isNew: true,
      realImages: [],
      userId: user.id,
    },
  ];
  console.log("📱 Criando produtos...");

  let createdCount = 0;
  for (const productData of allProducts) {
    try {
      const product = await prisma.product.create({
        data: {
          ...productData,
          originalPrice: productData.originalPrice,
          pixPrice: productData.pixPrice,
          installmentPrice: productData.installmentPrice,
        },
      });
      console.log(
        `✅ ${product.model} - ${product.storage} (${product.category})`
      );
      createdCount++;
    } catch (error) {
      console.error(`❌ Erro ao criar produto ${productData.model}:`, error);
    }
  }

  // Criar categorias
  const categories = [
    { name: "iPhones Seminovos", slug: "iphones-seminovos" },
    { name: "iPhones Novos", slug: "iphones-novos" },
    { name: "Macbooks", slug: "macbooks" },
    { name: "iPads", slug: "ipads" },
    { name: "Apple Watch", slug: "apple-watch" },
    { name: "Acessórios", slug: "acessorios" },
  ];

  console.log("📂 Criando categorias...");

  for (const categoryData of categories) {
    const category = await prisma.category.upsert({
      where: { slug: categoryData.slug },
      update: {},
      create: categoryData,
    });
    console.log(`✅ Categoria: ${category.name}`);
  }

  console.log(
    `🎉 Seed concluído! ${createdCount} produtos criados com sucesso!`
  );
}

main()
  .catch((e) => {
    console.error("❌ Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
