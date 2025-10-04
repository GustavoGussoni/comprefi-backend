# 🧪 Guia de Testes - CompreFi API

## 📁 **Arquivos de Teste Criados:**

1. **`price-calculator.service.spec.ts`** - Testes unitários do serviço de cálculo
2. **`product.controller.spec.ts`** - Testes unitários do controller
3. **`integration.test.ts`** - Testes de integração completos

## 🚀 **Como Executar:**

### **1. Colocar arquivos no projeto:**

```bash
# Copiar arquivos para as pastas corretas:
cp price-calculator.service.spec.ts src/modules/product/services/
cp product.controller.spec.ts src/modules/product/
cp integration.test.ts test/
```

### **2. Instalar dependências de teste (se necessário):**

```bash
npm install --save-dev @nestjs/testing supertest
```

### **3. Executar testes:**

#### **Testes Unitários:**

```bash
# Todos os testes unitários
npm run test

# Apenas testes do calculador de preços
npm run test -- price-calculator.service.spec.ts

# Apenas testes do controller
npm run test -- product.controller.spec.ts

# Com coverage
npm run test:cov
```

#### **Testes de Integração:**

```bash
# Testes de integração (precisa do banco rodando)
npm run test:e2e

# Ou específico
npm run test -- integration.test.ts
```

#### **Modo Watch (desenvolvimento):**

```bash
npm run test:watch
```

## 🎯 **O que os Testes Validam:**

### **📊 Cálculo de Preços:**

- ✅ Fórmula PIX: `(custo + frete) / 0.9`
- ✅ Fórmula Original: `(custo + frete) / 0.84`
- ✅ Fórmula Parcelas: `(pixPrice / 0.8651) / 12`
- ✅ Frete especial Macbooks: R$ 220
- ✅ Frete padrão outras categorias: R$ 100
- ✅ Formatação brasileira: "R$ 1.234,56"

### **🔧 Endpoints da API:**

- ✅ `POST /products/calculate-prices` - Calculadora
- ✅ `GET /products` - Listar produtos
- ✅ `GET /products?category=X` - Filtrar por categoria
- ✅ `GET /products/:id` - Produto específico
- ✅ `POST /products` - Criar produto
- ✅ `PATCH /products/:id` - Atualizar produto
- ✅ `DELETE /products/:id` - Deletar produto
- ✅ `GET /products/categories` - Listar categorias

### **🔐 Autenticação:**

- ✅ Login com JWT
- ✅ Proteção de rotas privadas
- ✅ Rejeição de tokens inválidos

## 📋 **Cenários de Teste:**

### **Exemplo 1 - iPhone:**

```
Custo: R$ 4.500
Frete: R$ 100 (padrão)
PIX: R$ 5.111,11
Original: R$ 5.476,19
Parcela: R$ 492,59
```

### **Exemplo 2 - MacBook:**

```
Custo: R$ 8.000
Frete: R$ 220 (especial)
PIX: R$ 9.133,33
Original: R$ 9.785,71
Parcela: R$ 879,17
```

## 🚨 **Pré-requisitos:**

### **Para Testes Unitários:**

- ✅ Apenas Node.js e dependências

### **Para Testes de Integração:**

- ✅ Banco de dados rodando (PostgreSQL/SQLite)
- ✅ Variáveis de ambiente configuradas
- ✅ API inicializável

## 🔍 **Comandos Úteis:**

```bash
# Ver apenas falhas
npm run test -- --verbose

# Executar teste específico
npm run test -- --testNamePattern="deve calcular preços corretamente"

# Debug de testes
npm run test:debug

# Limpar cache de testes
npm run test -- --clearCache
```

## 📊 **Interpretando Resultados:**

### **✅ Sucesso:**

```
PASS src/modules/product/services/price-calculator.service.spec.ts
✓ deve calcular preços corretamente com valores padrão
✓ deve aplicar frete de R$ 220 para categoria Macbook
```

### **❌ Falha:**

```
FAIL src/modules/product/services/price-calculator.service.spec.ts
✗ deve calcular preços corretamente com valores padrão
  Expected: 5111.11
  Received: 5000.00
```

## 🎯 **Próximos Passos:**

1. **Execute os testes** na sua máquina
2. **Verifique se passam** todos os cenários
3. **Reporte falhas** para ajustes
4. **Confirme** que as regras estão corretas
5. **Prossiga** para criação do admin

**Os testes cobrem todas as regras que definimos! 🚀**
