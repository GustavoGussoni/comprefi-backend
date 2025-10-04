"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🌱 Iniciando seed do banco de dados...");
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
    const sampleProducts = [
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
            userId: user.id,
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
            userId: user.id,
        },
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
            specs: 'Tela Liquid Retina XDR 16.2", Chip M4 Max (14/16-core CPU, 32/40-core GPU), 3x Thunderbolt 5, HDMI, SDXC, MagSafe 3, Wi-Fi 6E',
            isNew: true,
            realImages: [],
            userId: user.id,
        },
    ];
    console.log("📱 Criando produtos de exemplo...");
    for (const productData of sampleProducts) {
        const product = await prisma.product.create({
            data: productData,
        });
        console.log(`✅ Produto criado: ${product.model} - ${product.storage}`);
    }
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
        console.log(`✅ Categoria criada: ${category.name}`);
    }
    console.log("🎉 Seed concluído com sucesso!");
}
main()
    .catch((e) => {
    console.error("❌ Erro durante o seed:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map