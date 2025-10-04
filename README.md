# CompreFi API v2.0

API para gerenciamento de produtos Apple da CompreFi, adaptada para funcionar com o padrão de dados do frontend atual.

## 🚀 Principais Melhorias

### Estrutura de Dados Adaptada

- **Schema Prisma atualizado** para suportar todos os campos do frontend
- **Campos de preços calculados**: `originalPrice`, `installmentPrice`, `pixPrice`
- **Arrays de imagens reais**: `realImages[]` para produtos seminovos
- **Especificações técnicas**: campo `specs` detalhado
- **Categorização aprimorada**: suporte completo às categorias do frontend

### Funcionalidades Novas

- **Cálculo automático de preços** baseado no custo e fórmulas específicas
- **Integração com Google Sheets** (preparada para sincronização)
- **Agrupamento de produtos** por categoria ou outros campos
- **Criação em lote** de produtos
- **Documentação Swagger** completa

### Fórmulas de Cálculo

```
pixPrice = (custo + frete) / 0.9
installmentPrice = (pixPrice / 0.8651) / 12
originalPrice = pixPrice * 1.2 (20% a mais para alavancagem)
```

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL 13+
- npm ou yarn

## 🛠️ Instalação

1. **Clone o repositório**

```bash
git clone <url-do-repositorio>
cd comprefi-api
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure as variáveis de ambiente**

```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. **Configure o banco de dados**

```bash
# Gerar o cliente Prisma
npm run prisma:generate

# Executar migrações
npm run prisma:migrate

# Popular o banco com dados de exemplo
npm run prisma:seed
```

## 🚀 Executando a aplicação

### Desenvolvimento

```bash
npm run start:dev
```

### Produção

```bash
npm run build
npm run start:prod
```

A API estará disponível em `http://localhost:3000`

## 📚 Documentação

Acesse a documentação Swagger em: `http://localhost:3000/api/docs`

## 🔗 Endpoints Principais

### Produtos

- `GET /products` - Listar produtos (com filtros)
- `GET /products/:id` - Buscar produto por ID
- `GET /products/by-category/:slug` - Produtos por categoria
- `POST /products` - Criar produto
- `PATCH /products/:id` - Atualizar produto
- `DELETE /products/:id` - Deletar produto
- `POST /products/calculate-prices` - Calcular preços
- `POST /products/bulk-create` - Criar múltiplos produtos

### Filtros Disponíveis

- `?category=iPhones Seminovos` - Filtrar por categoria
- `?isNew=true` - Filtrar produtos novos/seminovos
- `?isActive=true` - Filtrar produtos ativos
- `?groupBy=category` - Agrupar resultados

### Autenticação

- `POST /auth/login` - Login
- `POST /auth/register` - Registro

## 🗄️ Estrutura do Banco

### Tabela Products

```sql
- id (UUID, PK)
- model (String) - Ex: "iPhone 15 Pro Max"
- storage (String) - Ex: "256GB", "(1TB)"
- color (String) - Ex: "Titânio Natural"
- battery (String) - Ex: "89%", "100%"
- originalPrice (String) - Ex: "R$ 6.590,00"
- installmentPrice (String) - Ex: "R$ 540,67"
- pixPrice (String) - Ex: "R$ 5.690"
- details (String) - Detalhes específicos
- image (String?) - URL da imagem principal
- realImages (String[]) - URLs das fotos reais
- category (String) - Ex: "iPhones Seminovos"
- specs (String) - Especificações técnicas
- cost (Float?) - Custo para cálculos
- freight (Float?) - Valor do frete
- isActive (Boolean) - Produto ativo
- isNew (Boolean) - Produto novo/seminovo
- userId (String, FK)
- createdAt, updatedAt (DateTime)
```

## 🔧 Configurações de Preço

A API suporta configurações flexíveis de cálculo de preços através da tabela `PriceConfig`:

```typescript
{
  freightValue: 100,      // Valor padrão do frete
  pixMultiplier: 0.9,     // Divisor para preço PIX
  installmentDiv1: 0.8651, // Primeiro divisor para parcelas
  installmentDiv2: 12,     // Número de parcelas
  originalPricePerc: 1.2   // Percentual sobre PIX para preço original
}
```

## 🔄 Sincronização com Google Sheets

Para habilitar a sincronização automática com Google Sheets:

1. **Configure as credenciais no .env**

```env
GOOGLE_CLIENT_EMAIL="sua-conta-servico@projeto.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_SHEET_ID="1BPVsBLD2eTbJzW286bSyZSnA_xI3TY2XPkp42FngIrg"
```

2. **Compartilhe a planilha** com o email da conta de serviço

3. **Use o endpoint de sincronização**

```bash
POST /products/sync-from-sheet
```

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Coverage
npm run test:cov
```

## 📦 Deploy

### Vercel (Recomendado)

1. Configure as variáveis de ambiente na Vercel
2. Conecte seu repositório
3. Deploy automático

### Docker

```bash
# Build da imagem
docker build -t comprefi-api .

# Executar container
docker run -p 3000:3000 comprefi-api
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto é propriedade da CompreFi e não possui licença pública.

## 🆘 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento da CompreFi.
