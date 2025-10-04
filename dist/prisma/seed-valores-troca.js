"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function seedValoresTraca() {
    console.log("🔄 Iniciando seed da tabela valores_troca...");
    const valoresTraca = [
        { modelo: "iPhone 11", capacidade: "64GB", valorBase: 1800.0 },
        { modelo: "iPhone 11", capacidade: "128GB", valorBase: 2000.0 },
        { modelo: "iPhone 11", capacidade: "256GB", valorBase: 2200.0 },
        { modelo: "iPhone 11 Pro", capacidade: "64GB", valorBase: 2200.0 },
        { modelo: "iPhone 11 Pro", capacidade: "256GB", valorBase: 2500.0 },
        { modelo: "iPhone 11 Pro", capacidade: "512GB", valorBase: 2800.0 },
        { modelo: "iPhone 11 Pro Max", capacidade: "64GB", valorBase: 2400.0 },
        { modelo: "iPhone 11 Pro Max", capacidade: "256GB", valorBase: 2700.0 },
        { modelo: "iPhone 11 Pro Max", capacidade: "512GB", valorBase: 3000.0 },
        { modelo: "iPhone 12 mini", capacidade: "64GB", valorBase: 2000.0 },
        { modelo: "iPhone 12 mini", capacidade: "128GB", valorBase: 2200.0 },
        { modelo: "iPhone 12 mini", capacidade: "256GB", valorBase: 2400.0 },
        { modelo: "iPhone 12", capacidade: "64GB", valorBase: 2300.0 },
        { modelo: "iPhone 12", capacidade: "128GB", valorBase: 2500.0 },
        { modelo: "iPhone 12", capacidade: "256GB", valorBase: 2700.0 },
        { modelo: "iPhone 12 Pro", capacidade: "128GB", valorBase: 2800.0 },
        { modelo: "iPhone 12 Pro", capacidade: "256GB", valorBase: 3000.0 },
        { modelo: "iPhone 12 Pro", capacidade: "512GB", valorBase: 3300.0 },
        { modelo: "iPhone 12 Pro Max", capacidade: "128GB", valorBase: 3000.0 },
        { modelo: "iPhone 12 Pro Max", capacidade: "256GB", valorBase: 3200.0 },
        { modelo: "iPhone 12 Pro Max", capacidade: "512GB", valorBase: 3500.0 },
        { modelo: "iPhone 13 mini", capacidade: "128GB", valorBase: 2500.0 },
        { modelo: "iPhone 13 mini", capacidade: "256GB", valorBase: 2700.0 },
        { modelo: "iPhone 13 mini", capacidade: "512GB", valorBase: 3000.0 },
        { modelo: "iPhone 13", capacidade: "128GB", valorBase: 2800.0 },
        { modelo: "iPhone 13", capacidade: "256GB", valorBase: 3000.0 },
        { modelo: "iPhone 13", capacidade: "512GB", valorBase: 3300.0 },
        { modelo: "iPhone 13 Pro", capacidade: "128GB", valorBase: 3300.0 },
        { modelo: "iPhone 13 Pro", capacidade: "256GB", valorBase: 3500.0 },
        { modelo: "iPhone 13 Pro", capacidade: "512GB", valorBase: 3800.0 },
        { modelo: "iPhone 13 Pro", capacidade: "1TB", valorBase: 4200.0 },
        { modelo: "iPhone 13 Pro Max", capacidade: "128GB", valorBase: 3500.0 },
        { modelo: "iPhone 13 Pro Max", capacidade: "256GB", valorBase: 3700.0 },
        { modelo: "iPhone 13 Pro Max", capacidade: "512GB", valorBase: 4000.0 },
        { modelo: "iPhone 13 Pro Max", capacidade: "1TB", valorBase: 4400.0 },
        { modelo: "iPhone 14", capacidade: "128GB", valorBase: 3200.0 },
        { modelo: "iPhone 14", capacidade: "256GB", valorBase: 3400.0 },
        { modelo: "iPhone 14", capacidade: "512GB", valorBase: 3700.0 },
        { modelo: "iPhone 14 Plus", capacidade: "128GB", valorBase: 3400.0 },
        { modelo: "iPhone 14 Plus", capacidade: "256GB", valorBase: 3600.0 },
        { modelo: "iPhone 14 Plus", capacidade: "512GB", valorBase: 3900.0 },
        { modelo: "iPhone 14 Pro", capacidade: "128GB", valorBase: 3800.0 },
        { modelo: "iPhone 14 Pro", capacidade: "256GB", valorBase: 4000.0 },
        { modelo: "iPhone 14 Pro", capacidade: "512GB", valorBase: 4300.0 },
        { modelo: "iPhone 14 Pro", capacidade: "1TB", valorBase: 4700.0 },
        { modelo: "iPhone 14 Pro Max", capacidade: "128GB", valorBase: 4000.0 },
        { modelo: "iPhone 14 Pro Max", capacidade: "256GB", valorBase: 4200.0 },
        { modelo: "iPhone 14 Pro Max", capacidade: "512GB", valorBase: 4500.0 },
        { modelo: "iPhone 14 Pro Max", capacidade: "1TB", valorBase: 4900.0 },
        { modelo: "iPhone 15", capacidade: "128GB", valorBase: 3600.0 },
        { modelo: "iPhone 15", capacidade: "256GB", valorBase: 3800.0 },
        { modelo: "iPhone 15", capacidade: "512GB", valorBase: 4100.0 },
        { modelo: "iPhone 15 Plus", capacidade: "128GB", valorBase: 3800.0 },
        { modelo: "iPhone 15 Plus", capacidade: "256GB", valorBase: 4000.0 },
        { modelo: "iPhone 15 Plus", capacidade: "512GB", valorBase: 4300.0 },
        { modelo: "iPhone 15 Pro", capacidade: "128GB", valorBase: 4200.0 },
        { modelo: "iPhone 15 Pro", capacidade: "256GB", valorBase: 4400.0 },
        { modelo: "iPhone 15 Pro", capacidade: "512GB", valorBase: 4700.0 },
        { modelo: "iPhone 15 Pro", capacidade: "1TB", valorBase: 5100.0 },
        { modelo: "iPhone 15 Pro Max", capacidade: "256GB", valorBase: 4600.0 },
        { modelo: "iPhone 15 Pro Max", capacidade: "512GB", valorBase: 4900.0 },
        { modelo: "iPhone 15 Pro Max", capacidade: "1TB", valorBase: 5300.0 },
        { modelo: "iPhone 16", capacidade: "128GB", valorBase: 4000.0 },
        { modelo: "iPhone 16", capacidade: "256GB", valorBase: 4200.0 },
        { modelo: "iPhone 16", capacidade: "512GB", valorBase: 4500.0 },
        { modelo: "iPhone 16 Plus", capacidade: "128GB", valorBase: 4200.0 },
        { modelo: "iPhone 16 Plus", capacidade: "256GB", valorBase: 4400.0 },
        { modelo: "iPhone 16 Plus", capacidade: "512GB", valorBase: 4700.0 },
        { modelo: "iPhone 16 Pro", capacidade: "128GB", valorBase: 4600.0 },
        { modelo: "iPhone 16 Pro", capacidade: "256GB", valorBase: 4800.0 },
        { modelo: "iPhone 16 Pro", capacidade: "512GB", valorBase: 5100.0 },
        { modelo: "iPhone 16 Pro", capacidade: "1TB", valorBase: 5500.0 },
        { modelo: "iPhone 16 Pro Max", capacidade: "256GB", valorBase: 5000.0 },
        { modelo: "iPhone 16 Pro Max", capacidade: "512GB", valorBase: 5300.0 },
        { modelo: "iPhone 16 Pro Max", capacidade: "1TB", valorBase: 5700.0 },
        { modelo: "iPhone SE (3ª geração)", capacidade: "64GB", valorBase: 1200.0 },
        {
            modelo: "iPhone SE (3ª geração)",
            capacidade: "128GB",
            valorBase: 1400.0,
        },
        {
            modelo: "iPhone SE (3ª geração)",
            capacidade: "256GB",
            valorBase: 1600.0,
        },
    ];
    console.log(`📱 Inserindo ${valoresTraca.length} valores de troca...`);
    for (const valor of valoresTraca) {
        try {
            await prisma.valorTroca.upsert({
                where: {
                    modelo_capacidade: {
                        modelo: valor.modelo,
                        capacidade: valor.capacidade,
                    },
                },
                update: {
                    valorBase: valor.valorBase,
                },
                create: {
                    modelo: valor.modelo,
                    capacidade: valor.capacidade,
                    valorBase: valor.valorBase,
                    ativo: true,
                },
            });
            console.log(`✅ ${valor.modelo} ${valor.capacidade} - R$ ${valor.valorBase.toFixed(2)}`);
        }
        catch (error) {
            console.error(`❌ Erro ao inserir ${valor.modelo} ${valor.capacidade}:`, error);
        }
    }
    console.log("✅ Seed da tabela valores_troca concluído!");
}
async function main() {
    try {
        await seedValoresTraca();
    }
    catch (error) {
        console.error("❌ Erro durante o seed:", error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=seed-valores-troca.js.map