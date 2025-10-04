import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log(
    "🌱 Iniciando seed incremental - adicionando produtos restantes..."
  );

  // Buscar usuário existente
  const user = await prisma.user.findUnique({
    where: { email: "admin@comprefi.com" },
  });

  if (!user) {
    console.error(
      "❌ Usuário admin não encontrado. Execute o seed completo primeiro."
    );
    process.exit(1);
  }

  console.log("👤 Usuário encontrado:", user.email);

  // ADICIONE AQUI OS PRODUTOS RESTANTES
  // Substitua este array pelos produtos que você quer adicionar
  const produtosRestantes = [
    // iPads

    {
      model: 'iPad Pro 7 13" M4',
      storage: "(1TB / Wi-Fi)",
      color: "Prateado, Preto-espacial",
      battery: "100%",
      originalPrice: "R$ 16.167,20",
      installmentPrice: "R$ 1.399",
      pixPrice: "R$ 14.523",
      details: "aparelho novo",
      realImages: [],
      category: "iPads",
      specs:
        'Chip M4, Tela Ultra Retina XDR 13", Câmeras Pro 12MP (frontal e traseira), Face ID, USB-C (Thunderbolt/USB 4), Wi-Fi 6E, Bluetooth 5.3',
      isNew: true,
      userId: user.id,
    },
    {
      model: 'iPad Pro 7 13" M4',
      storage: "512GB",
      color: "Prateado, Preto-espacial",
      battery: "100%",
      originalPrice: "R$ 14.440,62",
      installmentPrice: "R$ 1.201",
      pixPrice: "R$ 12.464",
      details: "aparelho novo",
      realImages: [],
      category: "iPads",
      specs:
        'Chip M4, Tela Ultra Retina XDR 13", Câmeras Pro 12MP (frontal e traseira), Face ID, USB-C (Thunderbolt/USB 4), Wi-Fi 6E, Bluetooth 5.3',
      isNew: true,
      userId: user.id,
    },
    {
      model: 'iPad Pro 7 13" M4',
      storage: "256GB",
      color: "Prateado, Preto-espacial",
      battery: "100%",
      originalPrice: "R$ 13.026,70",
      installmentPrice: "R$ 1.138",
      pixPrice: "R$ 11.817",
      details: "aparelho novo",
      realImages: [],
      category: "iPads",
      specs:
        'Chip M4, Tela Ultra Retina XDR 13", Câmeras Pro 12MP (frontal e traseira), Face ID, USB-C (Thunderbolt/USB 4), Wi-Fi 6E, Bluetooth 5.3',
      isNew: true,
      userId: user.id,
    },
    {
      model: 'iPad Pro 5 11" M4',
      storage: "256GB",
      color: "Prateado, Preto-espacial",
      battery: "100%",
      originalPrice: "R$ 10.148,43",
      installmentPrice: "R$ 844",
      pixPrice: "R$ 8.758",
      details: "aparelho novo",
      realImages: [],
      category: "iPads",
      specs:
        'Chip M4, Tela Ultra Retina XDR 11", Câmeras Pro 12MP (frontal e traseira), Face ID, USB-C (Thunderbolt/USB 4), Wi-Fi 6E, Bluetooth 5.3',
      isNew: true,
      userId: user.id,
    },
    {
      model: 'iPad Air 6 13" M2',
      storage: "128GB",
      color: "Azul, Roxo, Estelar, Cinza-espacial",
      battery: "100%",
      originalPrice: "R$ 7.433,11",
      installmentPrice: "R$ 640",
      pixPrice: "R$ 6.641",
      details: "aparelho novo",
      realImages: [],
      category: "iPads",
      specs:
        'Chip M2, Tela Liquid Retina 13", Câmera frontal 12MP na horizontal (Palco Central), Câmera traseira 12MP, Touch ID, USB-C, Wi-Fi 6E, Bluetooth 5.3',
      isNew: true,
      userId: user.id,
    },
    {
      model: 'iPad Air 6 11" M2',
      storage: "256GB",
      color: "Azul, Roxo, Estelar, Cinza-espacial",
      battery: "100%",
      originalPrice: "R$ 6.410,22",
      installmentPrice: "R$ 560",
      pixPrice: "R$ 5.817",
      details: "aparelho novo",
      realImages: [],
      category: "iPads",
      specs:
        'Chip M2, Tela Liquid Retina 11", Câmera frontal 12MP na horizontal (Palco Central), Câmera traseira 12MP, Touch ID, USB-C, Wi-Fi 6E, Bluetooth 5.3',
      isNew: true,
      userId: user.id,
    },
    {
      model: 'iPad Air 6 11" M2',
      storage: "128GB",
      color: "Azul, Roxo, Estelar, Cinza-espacial",
      battery: "100%",
      originalPrice: "R$ 5.800,81",
      installmentPrice: "R$ 498",
      pixPrice: "R$ 5.170",
      details: "aparelho novo",
      realImages: [],
      category: "iPads",
      specs:
        'Chip M2, Tela Liquid Retina 11", Câmera frontal 12MP na horizontal (Palco Central), Câmera traseira 12MP, Touch ID, USB-C, Wi-Fi 6E, Bluetooth 5.3',
      isNew: true,
      userId: user.id,
    },
    {
      model: "iPad Mini 7",
      storage: "256GB",
      color: "Azul, Roxo, Estelar, Cinza-espacial",
      battery: "100%",
      originalPrice: "R$ 5.774,43",
      installmentPrice: "R$ 492",
      pixPrice: "R$ 5.111",
      details: "aparelho novo",
      realImages: [],
      category: "iPads",
      specs:
        'Chip A17 Pro, Tela Liquid Retina 8.3", Câmera frontal 12MP na horizontal (Palco Central), Câmera traseira 12MP, Touch ID, USB-C, Wi-Fi 6E, Bluetooth 5.3',
      isNew: true,
      userId: user.id,
    },
    {
      model: 'iPad Air 5 10,9" M1',
      storage: "64GB",
      color: "Cinza-espacial, Estelar, Rosa, Roxo, Azul",
      battery: "100%",
      originalPrice: "R$ 5.307,50",
      installmentPrice: "R$ 436",
      pixPrice: "R$ 4.523",
      details: "aparelho novo",
      realImages: [],
      category: "iPads",
      specs:
        'Chip M1, Tela Liquid Retina 10.9", Câmera frontal 12MP (Palco Central), Câmera traseira 12MP, Touch ID, USB-C, Wi-Fi 6, Bluetooth 5.0',
      isNew: true,
      userId: user.id,
    },
    {
      model: "iPad Mini 7",
      storage: "128GB",
      color: "Azul, Roxo, Estelar, Cinza-espacial",
      battery: "100%",
      originalPrice: "R$ 5.163,54",
      installmentPrice: "R$ 424",
      pixPrice: "R$ 4.405",
      details: "aparelho novo",
      realImages: [],
      category: "iPads",
      specs:
        'Chip A17 Pro, Tela Liquid Retina 8.3", Câmera frontal 12MP na horizontal (Palco Central), Câmera traseira 12MP, Touch ID, USB-C, Wi-Fi 6E, Bluetooth 5.3',
      isNew: true,
      userId: user.id,
    },
    {
      model: "iPad 10",
      storage: "256GB",
      color: "Prateado, Azul, Rosa, Amarelo",
      battery: "100%",
      originalPrice: "R$ 4.755,76",
      installmentPrice: "R$ 390",
      pixPrice: "R$ 4.052",
      details: "aparelho novo",
      realImages: [],
      category: "iPads",
      specs:
        'Chip A14 Bionic, Tela Liquid Retina 10.9", Câmera frontal 12MP na horizontal (Palco Central), Câmera traseira 12MP, Touch ID, USB-C, Wi-Fi 6, Bluetooth 5.2',
      isNew: true,
      userId: user.id,
    },
    {
      model: "iPad 9",
      storage: "256GB",
      color: "Prateado, Cinza-espacial",
      battery: "100%",
      originalPrice: "R$ 4.427,00",
      installmentPrice: "R$ 356",
      pixPrice: "R$ 3.699",
      details: "aparelho novo",
      realImages: [],
      category: "iPads",
      specs:
        'Chip A13 Bionic, Tela Retina 10.2", Câmera frontal 12MP (Palco Central), Câmera traseira 8MP, Touch ID, Conector Lightning, Wi-Fi 5, Bluetooth 4.2',
      isNew: true,
      userId: user.id,
    },
    {
      model: "iPad Mini 6",
      storage: "64GB",
      color: "Cinza-espacial, Rosa, Roxo, Estelar",
      battery: "100%",
      originalPrice: "R$ 4.128,35",
      installmentPrice: "R$ 334",
      pixPrice: "R$ 3.464",
      details: "aparelho novo",
      realImages: [],
      category: "iPads",
      specs:
        'Chip A15 Bionic, Tela Liquid Retina 8.3", Câmera frontal 12MP (Palco Central), Câmera traseira 12MP, Touch ID, USB-C, Wi-Fi 6, Bluetooth 5.0',
      isNew: true,
      userId: user.id,
    },
    {
      model: "iPad 9",
      storage: "64GB",
      color: "Prateado, Cinza-espacial",
      battery: "100%",
      originalPrice: "R$ 3.739,48",
      installmentPrice: "R$ 322",
      pixPrice: "R$ 3.347",
      details: "aparelho novo",
      realImages: [],
      category: "iPads",
      specs:
        'Chip A13 Bionic, Tela Retina 10.2", Câmera frontal 12MP (Palco Central), Câmera traseira 8MP, Touch ID, Conector Lightning, Wi-Fi 5, Bluetooth 4.2',
      isNew: true,
      userId: user.id,
    },
    {
      model: "iPad 10",
      storage: "64GB",
      color: "Prateado, Azul, Rosa, Amarelo",
      battery: "100%",
      originalPrice: "R$ 3.308,83",
      installmentPrice: "R$ 271",
      pixPrice: "R$ 2.817",
      details: "aparelho novo",
      realImages: [],
      category: "iPads",
      specs:
        'Chip A14 Bionic, Tela Liquid Retina 10.9", Câmera frontal 12MP na horizontal (Palco Central), Câmera traseira 12MP, Touch ID, USB-C, Wi-Fi 6, Bluetooth 5.2',
      isNew: true,
      userId: user.id,
    },
    {
      model: "iPad 9",
      storage: "64GB",
      color: "Prateado, Cinza-espacial",
      battery: "100%",
      originalPrice: "R$ 3.100,66",
      installmentPrice: "R$ 254",
      pixPrice: "R$ 2.641",
      details: "aparelho novo",
      realImages: [],
      category: "iPads",
      specs:
        'Chip A13 Bionic, Tela Retina 10.2", Câmera frontal 12MP (Palco Central), Câmera traseira 8MP, Touch ID, Conector Lightning, Wi-Fi 5, Bluetooth 4.2',
      isNew: true,
      userId: user.id,
    },
    // Apple Watch
    {
      model: "Apple Watch Ultra 2 (M.)",
      storage: "(49mm)",
      color: "Titânio Natural (com pulseiras variadas)",
      battery: "100%",
      originalPrice: "R$ 8.676,92",
      installmentPrice: "R$ 738",
      pixPrice: "R$ 7.664",
      details: "aparelho novo",
      realImages: [],
      category: "Apple Watch",
      specs:
        "Chip S9 SiP, Tela Retina Sempre Ativa LTPO OLED (até 3000 nits), GPS de precisão e dupla frequência, Botão de Ação, Sirene, Profundímetro, Sensor de temperatura da água, Oxigênio no Sangue, ECG, Sensor cardíaco óptico, Detecção de Queda/Acidente, Resistência à água 100m, Certificação MIL-STD 810H, Mergulho recreativo até 40m, Wi-Fi 4, Bluetooth 5.3",
      isNew: true,
      userId: user.id,
    },
    {
      model: "Apple Watch Ultra 2 (24)",
      storage: "(49mm)",
      color: "Titânio Natural (com pulseiras variadas)",
      battery: "100%",
      originalPrice: "R$ 6.833,39",
      installmentPrice: "R$ 574",
      pixPrice: "R$ 5.960",
      details: "aparelho novo",
      realImages: [],
      category: "Apple Watch",
      specs:
        "Chip S9 SiP, Tela Retina Sempre Ativa LTPO OLED (até 3000 nits), GPS de precisão e dupla frequência, Botão de Ação, Sirene, Profundímetro, Sensor de temperatura da água, Oxigênio no Sangue, ECG, Sensor cardíaco óptico, Detecção de Queda/Acidente, Resistência à água 100m, Certificação MIL-STD 810H, Mergulho recreativo até 40m, Wi-Fi 4, Bluetooth 5.3",
      isNew: true,
      userId: user.id,
    },
    {
      model: "Apple Watch Ultra 2 (23)",
      storage: "(49mm)",
      color: "Titânio Natural (com pulseiras variadas)",
      battery: "100%",
      originalPrice: "R$ 6.687,37",
      installmentPrice: "R$ 541",
      pixPrice: "R$ 5.619",
      details: "aparelho novo",
      realImages: [],
      category: "Apple Watch",
      specs:
        "Chip S9 SiP, Tela Retina Sempre Ativa LTPO OLED (até 3000 nits), GPS de precisão e dupla frequência, Botão de Ação, Sirene, Profundímetro, Sensor de temperatura da água, Oxigênio no Sangue, ECG, Sensor cardíaco óptico, Detecção de Queda/Acidente, Resistência à água 100m, Certificação MIL-STD 810H, Mergulho recreativo até 40m, Wi-Fi 4, Bluetooth 5.3",
      isNew: true,
      userId: user.id,
    },
    {
      model: "Apple Watch Series 10",
      storage: "(46mm)",
      color: "Meia-noite, Estelar, Prateado, Rosa, (PRODUCT)RED",
      battery: "100%",
      originalPrice: "R$ 3.597,05",
      installmentPrice: "R$ 289",
      pixPrice: "R$ 3.005",
      details: "aparelho novo",
      realImages: [],
      category: "Apple Watch",
      specs:
        "Chip S9 SiP, Tela Retina Sempre Ativa LTPO OLED (até 2000 nits), Oxigênio no Sangue, ECG, Sensor cardíaco óptico, Detecção de Queda/Acidente, Sensor de temperatura, Resistência à água 50m, GPS, Wi-Fi 4, Bluetooth 5.3",
      isNew: true,
      userId: user.id,
    },
    {
      model: "Apple Watch Series 10",
      storage: "(42mm)",
      color: "Meia-noite, Estelar, Prateado, Rosa, (PRODUCT)RED",
      battery: "100%",
      originalPrice: "R$ 3.468,37",
      installmentPrice: "R$ 279",
      pixPrice: "R$ 2.892",
      details: "aparelho novo",
      realImages: [],
      category: "Apple Watch",
      specs:
        "Chip S9 SiP, Tela Retina Sempre Ativa LTPO OLED (até 2000 nits), Oxigênio no Sangue, ECG, Sensor cardíaco óptico, Detecção de Queda/Acidente, Sensor de temperatura, Resistência à água 50m, GPS, Wi-Fi 4, Bluetooth 5.3",
      isNew: true,
      userId: user.id,
    },
    {
      model: "Apple Watch Series 9",
      storage: "(45mm)",
      color: "Meia-noite, Estelar, Prateado, Rosa, (PRODUCT)RED",
      battery: "100%",
      originalPrice: "R$ 3.242,03",
      installmentPrice: "R$ 261",
      pixPrice: "R$ 2.710",
      details: "aparelho novo",
      realImages: [],
      category: "Apple Watch",
      specs:
        "Chip S9 SiP, Tela Retina Sempre Ativa LTPO OLED (até 2000 nits), Oxigênio no Sangue, ECG, Sensor cardíaco óptico, Detecção de Queda/Acidente, Sensor de temperatura, Resistência à água 50m, GPS, Wi-Fi 4, Bluetooth 5.3",
      isNew: true,
      userId: user.id,
    },
    {
      model: "Apple Watch Series 9",
      storage: "(41mm)",
      color: "Meia-noite, Estelar, Prateado, Rosa, (PRODUCT)RED",
      battery: "100%",
      originalPrice: "R$ 3.175,22",
      installmentPrice: "R$ 257",
      pixPrice: "R$ 2.664",
      details: "aparelho novo",
      realImages: [],
      category: "Apple Watch",
      specs:
        "Chip S9 SiP, Tela Retina Sempre Ativa LTPO OLED (até 2000 nits), Oxigênio no Sangue, ECG, Sensor cardíaco óptico, Detecção de Queda/Acidente, Sensor de temperatura, Resistência à água 50m, GPS, Wi-Fi 4, Bluetooth 5.3",
      isNew: true,
      userId: user.id,
    },
    {
      model: "Apple Watch SE 2ª Ger",
      storage: "(44mm)",
      color: "Meia-noite, Estelar, Prateado",
      battery: "100%",
      originalPrice: "R$ 2.393,53",
      installmentPrice: "R$ 195",
      pixPrice: "R$ 2.028",
      details: "aparelho novo",
      realImages: [],
      category: "Apple Watch",
      specs:
        "Chip S8 SiP, Tela Retina LTPO OLED (até 1000 nits), Sensor cardíaco óptico, Detecção de Queda/Acidente, Resistência à água 50m, GPS, Wi-Fi 4, Bluetooth 5.3",
      isNew: true,
      userId: user.id,
    },
    {
      model: "Apple Watch SE 2ª Ger",
      storage: "(40mm)",
      color: "Meia-noite, Estelar, Prateado",
      battery: "100%",
      originalPrice: "R$ 2.156,39",
      installmentPrice: "R$ 175",
      pixPrice: "R$ 1.812",
      details: "aparelho novo",
      realImages: [],
      category: "Apple Watch",
      specs:
        "Chip S8 SiP, Tela Retina LTPO OLED (até 1000 nits), Sensor cardíaco óptico, Detecção de Queda/Acidente, Resistência à água 50m, GPS, Wi-Fi 4, Bluetooth 5.3",
      isNew: true,
      userId: user.id,
    },
    // Acessórios
    {
      model: "AirPods Max",
      storage: "",
      color: "Cinza-espacial, Prateado, Verde, Azul-celeste, Rosa",
      battery: "100%",
      originalPrice: "R$ 5.207,42",
      installmentPrice: "R$ 424",
      pixPrice: "R$ 4.400",
      details: "aparelho novo",
      realImages: [],
      category: "Acessorios",
      specs:
        "Chip H1 (em cada fone), Cancelamento Ativo de Ruído, Modo Ambiente, Áudio Espacial com rastreamento dinâmico da cabeça, Equalização Adaptativa, Até 20h de áudio com ANC/Modo Ambiente",
      isNew: true,
      userId: user.id,
    },
    {
      model: "AirPods Pro 2ª Geração (Tipo C Magsafe)",
      storage: "Tipo C Magsafe",
      color: "Branco",
      battery: "100%",
      originalPrice: "R$ 2.189,21",
      installmentPrice: "R$ 182",
      pixPrice: "R$ 1.891",
      details: "aparelho novo",
      realImages: [],
      category: "Acessorios",
      specs:
        "Chip H2, Cancelamento Ativo de Ruído (até 2x melhor), Modo Ambiente Adaptável, Áudio Espacial Personalizado, Controle por Toque, Resistência a poeira, suor e água (IP54), Estojo de carregamento MagSafe (USB-C) com alto-falante e entrada para cordão",
      isNew: true,
      userId: user.id,
    },
    {
      model: "AirPods 4 (C/ Noise Cancelation)",
      storage: "C/ Noise Cancelation",
      color: "Branco",
      battery: "100%",
      originalPrice: "R$ 2.232,87",
      installmentPrice: "R$ 182",
      pixPrice: "R$ 1.891",
      details: "aparelho novo",
      realImages: [],
      category: "Acessorios",
      specs:
        "Chip H2 (provável), Cancelamento Ativo de Ruído, Áudio Espacial, Design atualizado (provável), Estojo de carregamento USB-C (provável)",
      isNew: true,
      userId: user.id,
    },
    {
      model: "AirPods 4 (S/ Noise Cancelation)",
      storage: "S/ Noise Cancelation",
      color: "Branco",
      battery: "100%",
      originalPrice: "R$ 1.853,88",
      installmentPrice: "R$ 151",
      pixPrice: "R$ 1.572",
      details: "aparelho novo",
      realImages: [],
      category: "Acessorios",
      specs:
        "Chip H2 (provável), Áudio Espacial, Design atualizado (provável), Estojo de carregamento USB-C (provável)",
      isNew: true,
      userId: user.id,
    },
    {
      model: "AirPods 3",
      storage: "",
      color: "Branco",
      battery: "100%",
      originalPrice: "R$ 1.449,37",
      installmentPrice: "R$ 123",
      pixPrice: "R$ 1.279",
      details: "aparelho novo",
      realImages: [],
      category: "Acessorios",
      specs:
        "Chip H1, Áudio Espacial com rastreamento dinâmico da cabeça, Equalização Adaptativa, Sensor de força, Resistência a suor e água (IPX4), Estojo de carregamento MagSafe ou Lightning",
      isNew: true,
      userId: user.id,
    },
    {
      model: "AirPods 2",
      storage: "",
      color: "Branco",
      battery: "100%",
      originalPrice: "R$ 1.204,73",
      installmentPrice: "R$ 104",
      pixPrice: "R$ 1.083",
      details: "aparelho novo",
      realImages: [],
      category: "Acessorios",
      specs:
        "Chip H1, Acesso à Siri por voz, Conexão rápida, Até 5h de áudio, Estojo de carregamento Lightning",
      isNew: true,
      userId: user.id,
    },
    {
      model: "Apple Pencil Pro",
      storage: "",
      color: "Branco",
      originalPrice: "R$ 1.394,09",
      installmentPrice: "R$ 116",
      pixPrice: "R$ 1.205",
      details: "aparelho novo",
      realImages: [],
      category: "Acessorios",
      specs:
        "Pareamento e carga sem fio, Precisão absoluta, Sensibilidade à inclinação e pressão, Baixa latência, Gesto de apertar, Rotação do sensor giroscópico, Resposta tátil, Buscar Apple Pencil, Ponta substituível",
      battery: "",
      isNew: true,
      userId: user.id,
    },
    {
      model: "Apple Pencil 1ª Geração",
      storage: "",
      color: "Branco",
      originalPrice: "R$ 1.226,77",
      installmentPrice: "R$ 105",
      pixPrice: "R$ 1.095",
      details: "aparelho novo",
      realImages: [],
      category: "Acessorios",
      specs:
        "Pareamento e carga via Lightning, Precisão absoluta, Sensibilidade à inclinação e pressão, Baixa latência, Ponta substituível",
      battery: "",
      isNew: true,
      userId: user.id,
    },
    {
      model: "AirTag (4 unidades)",
      storage: "4 unidades",
      color: "Branco/Prateado",
      originalPrice: "R$ 1.109,71",
      installmentPrice: "R$ 94",
      pixPrice: "R$ 973",
      details: "aparelho novo",
      realImages: [],
      category: "Acessorios",
      specs:
        "Chip U1 (Banda Ultralarga e Busca Precisa), Bluetooth LE, Alto-falante integrado, Resistência a água e poeira (IP67), Bateria CR2032 substituível (dura mais de um ano), Integração com app Buscar",
      battery: "",
      isNew: true,
      userId: user.id,
    },
    {
      model: "Apple Pencil 2ª Geração",
      storage: "",
      color: "Branco",
      originalPrice: "R$ 1.076,06",
      installmentPrice: "R$ 93",
      pixPrice: "R$ 960",
      details: "aparelho novo",
      realImages: [],
      category: "Acessorios",
      specs:
        "Pareamento e carga magnética, Precisão absoluta, Sensibilidade à inclinação e pressão, Baixa latência, Dois toques para trocar de ferramenta, Ponta substituível",
      battery: "",
      isNew: true,
      userId: user.id,
    },
    {
      model: "AirTag (1 unidades)",
      storage: "1 unidades",
      color: "Branco/Prateado",
      originalPrice: "R$ 642,93",
      installmentPrice: "R$ 52",
      pixPrice: "R$ 544",
      details: "aparelho novo",
      realImages: [],
      category: "Acessorios",
      specs:
        "Chip U1 (Banda Ultralarga e Busca Precisa), Bluetooth LE, Alto-falante integrado, Resistência a água e poeira (IP67), Bateria CR2032 substituível (dura mais de um ano), Integração com app Buscar",
      battery: "",
      isNew: true,
      userId: user.id,
    },
    {
      model: "Fonte Turbo USB-C 20w",
      storage: "",
      color: "Branco",
      originalPrice: "R$ 293,13",
      installmentPrice: "R$ 24",
      pixPrice: "R$ 250",
      details: "aparelho novo",
      realImages: [],
      category: "Acessorios",
      specs:
        "Adaptador de energia USB-C de 20W, Carregamento rápido para iPhones e iPads compatíveis",
      battery: "",
      isNew: true,
      userId: user.id,
    },
    {
      model: "Cabo USB-C",
      storage: "",
      color: "Branco",
      originalPrice: "R$ 298,63",
      installmentPrice: "R$ 24",
      pixPrice: "R$ 250",
      details: "aparelho novo",
      realImages: [],
      category: "Acessorios",
      specs:
        "Cabo de carregamento USB-C para USB-C (1m ou 2m), Suporta carregamento e transferência de dados",
      battery: "",
      isNew: true,
      userId: user.id,
    },
    {
      model: "Cabo Lightning",
      storage: "",
      color: "Branco",
      originalPrice: "R$ 296,22",
      installmentPrice: "R$ 24",
      pixPrice: "R$ 250",
      details: "aparelho novo",
      realImages: [],
      category: "Acessorios",
      specs:
        "Cabo de USB-C para Lightning ou USB-A para Lightning (1m ou 2m), Suporta carregamento e transferência de dados",
      battery: "",
      isNew: true,
      userId: user.id,
    },
  ];

  // Criar produtos restantes
  console.log(
    `📱 Adicionando ${produtosRestantes.length} produtos restantes...`
  );

  let produtosCriados = 0;

  for (const productData of produtosRestantes) {
    try {
      await prisma.product.create({
        data: {
          ...productData,
          originalPrice: productData.originalPrice,
          pixPrice: productData.pixPrice,
          installmentPrice: productData.installmentPrice,
        },
      });
      produtosCriados++;
      console.log(
        `✅ Produto criado: ${productData.model} - ${productData.storage}`
      );
    } catch (error) {
      console.error(`❌ Erro ao criar produto ${productData.model}:`, error);
    }
  }

  console.log(
    `🎉 Seed incremental concluído! ${produtosCriados} produtos adicionados com sucesso!`
  );
}

main()
  .catch((e) => {
    console.error("❌ Erro durante o seed incremental:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("🔌 Conexão com o banco encerrada");
  });
