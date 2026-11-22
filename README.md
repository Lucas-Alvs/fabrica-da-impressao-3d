# Fábrica Da Impressão 3D — Sistema de Orçamentos

Sistema web completo e profissional para cálculo de custos, precificação em lote e geração
de orçamentos em PDF para impressão 3D. Interface na identidade visual da marca (preto `#111111`,
laranja `#FF6B00`, branco e cinza claro `#F3F3F3`, tipografia Montserrat).

---

## Sumário

- [Visão geral](#visão-geral)
- [Stack](#stack)
- [Rodando localmente](#rodando-localmente)
- [Login inicial](#login-inicial)
- [Como o cálculo funciona](#como-o-cálculo-funciona)
- [Precificação em lote](#precificação-em-lote)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Banco de dados](#banco-de-dados)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Deploy na Vercel](#deploy-na-vercel)
- [Deploy na Netlify](#deploy-na-netlify)
- [Segurança](#segurança)
- [Backup](#backup)
- [Personalização visual](#personalização-visual)

---

## Visão geral

| Módulo | O que faz |
| --- | --- |
| **Dashboard** | Total de orçamentos, faturamento estimado, lucro, horas impressas, consumo energético, material mais usado, clientes e últimos orçamentos |
| **Clientes** | Cadastro (nome, celular/WhatsApp, e-mail, empresa), busca, histórico completo e atalho “Novo orçamento para este cliente” |
| **Materiais** | PLA, PETG, ABS, TPU, ASA e Outro com cor, valor por Kg e estoque — todos editáveis |
| **Calculadora** | Peso, tempo (h/min), quantidade, material e observações, com prévia de todos os custos em tempo real |
| **Produção em massa** | Peças por mesa → ciclos, horas totais, peso total, energia total, lucro e faturamento |
| **Precificação em lote** | Desconto automático a partir de 50 peças, com selo verde “✅ Preço de lote aplicado” |
| **Histórico** | Visualizar, editar, duplicar, baixar PDF e apagar orçamentos; busca por projeto, cliente, telefone e data |
| **PDF** | Orçamento profissional no layout da marca, gerado no servidor |
| **WhatsApp** | Mensagem automática com cliente, projeto, quantidade e valor final |
| **Configurações** | kWh, potência, valor e vida útil da impressora, manutenção, mão de obra, lucro, margem mínima e faixas de lote |
| **Segurança** | Login administrativo, rotas protegidas por middleware + validação no servidor, backup em JSON e log de alterações |

## Stack

- **Next.js 15** (App Router, React Server Components) + **React 19**
- **TypeScript** estrito
- **TailwindCSS** (design system da marca)
- **React Hook Form** nos formulários
- **Node.js** (rotas de API no runtime do servidor)
- **SQLite** (desenvolvimento, via `node:sqlite` — sem dependência nativa) e **PostgreSQL** (produção)
- **pdf-lib** para o PDF (JavaScript puro, sem binários nativos nem navegador headless — funciona em serverless)

> **Por que pdf-lib e não React-PDF/PDFMake?** O PDF é desenhado vetorialmente com controle total do
> layout da marca, e a biblioteca roda sem binários nativos em qualquer hospedagem serverless.
> O arquivo `src/lib/pdf.ts` concentra todo o desenho do documento.

## Rodando localmente

Requisitos: **Node.js 22.5+** (usa o SQLite embutido do Node).

```bash
# 1. instalar dependências
npm install

# 2. criar o arquivo de ambiente
cp .env.example .env.local

# 3. subir o servidor de desenvolvimento
npm run dev
```

Acesse **http://localhost:3000**. O banco SQLite é criado automaticamente em `data/fabrica.sqlite`
com as configurações padrão, os 6 materiais e as 5 faixas de lote já cadastradas.

Outros comandos:

```bash
npm run build      # build de produção
npm run start      # servir o build
npm run typecheck  # checagem de tipos
```

## Login inicial

| Campo | Valor padrão |
| --- | --- |
| E-mail | `admin@fabrica3d.com` (ou o valor de `ADMIN_EMAIL`) |
| Senha | `fabrica123` (ou o valor de `ADMIN_PASSWORD`) |

No primeiro login a senha inicial é convertida em hash e gravada no banco.
Depois disso, altere em **Configurações → Segurança → Alterar senha**.

## Como o cálculo funciona

Todas as fórmulas ficam em `src/lib/calc.ts` (funções puras, usadas no navegador e no servidor —
o valor exibido é exatamente o valor salvo):

```
1. Material    = (gramas ÷ 1000) × valor do Kg
2. Energia     = (watts ÷ 1000) × horas × valor do kWh
3. Desgaste    = (valor da impressora ÷ vida útil) × horas
4. Manutenção  = valor de manutenção por hora × horas
5. Mão de obra = valor por hora × horas   OU   % sobre o custo direto
6. Lucro       = % sobre o custo           OU   valor fixo por peça
7. Valor final = material + energia + desgaste + manutenção + mão de obra + lucro
```

Configuração inicial (Bambu Lab A1 Mini, editável em **Configurações**):

| Parâmetro | Valor |
| --- | --- |
| Potência média real | 95 W |
| Vida útil | 10.000 h |
| Valor da impressora | R$ 2.000,00 |
| Valor do kWh | R$ 0,75 |
| Manutenção | R$ 0,50/h |
| Mão de obra | R$ 25,00/h |
| Lucro | 40% sobre o custo |
| Margem mínima | 20% |

O sistema garante que o preço nunca fique abaixo de **custo + margem mínima**.

## Precificação em lote

Faixas padrão (todas editáveis em **Configurações → Faixas de desconto por lote**):

| Quantidade | Desconto |
| --- | --- |
| 1 a 49 peças | sem desconto |
| 50 a 99 peças | 15% |
| 100 a 199 peças | 20% |
| 200 a 499 peças | 25% |
| 500 peças ou mais | orçamento especial (sob consulta) |

Ao entrar em uma faixa com desconto, a calculadora e o PDF exibem o selo verde
**✅ PREÇO DE LOTE APLICADO** com quantidade, faixa, desconto, valor economizado e valor final.
A seção **Comparação de preço** mostra preço unitário, preço em lote por peça, economia e percentual.

## Estrutura do projeto

```
src/
├─ app/
│  ├─ (painel)/                # Área autenticada (layout com sidebar)
│  │  ├─ dashboard/            # Painel principal
│  │  ├─ clientes/             # Lista + detalhe do cliente com histórico
│  │  ├─ materiais/            # Catálogo de filamentos
│  │  ├─ orcamentos/           # Lista, novo, detalhe e edição
│  │  └─ configuracoes/        # Parâmetros, faixas, segurança e logs
│  ├─ api/                     # Rotas de API (Node.js)
│  │  ├─ auth/                 # login, logout
│  │  ├─ clients/              # CRUD de clientes
│  │  ├─ materials/            # CRUD de materiais
│  │  ├─ quotes/               # CRUD + duplicar + PDF
│  │  ├─ settings/             # Configurações, faixas e senha
│  │  ├─ dashboard/            # Métricas agregadas
│  │  └─ backup/               # Exportação do banco em JSON
│  ├─ login/                   # Tela de acesso
│  ├─ globals.css              # Tailwind + design system
│  └─ layout.tsx               # Montserrat + metadados
├─ components/                 # UI reutilizável (shell, formulários, cards)
├─ lib/
│  ├─ calc.ts                  # Motor de cálculo (puro, compartilhado)
│  ├─ db.ts                    # Acesso a SQLite/PostgreSQL + schema + seed
│  ├─ repo.ts                  # Consultas de domínio
│  ├─ auth.ts                  # Sessão HMAC + hash scrypt
│  ├─ pdf.ts                   # Geração do PDF da marca
│  ├─ quote-input.ts           # Validação da entrada de orçamento
│  ├─ format.ts                # Formatadores BRL, datas, horas
│  └─ types.ts                 # Tipos compartilhados
└─ middleware.ts               # Proteção de rotas
```

## Banco de dados

O banco é escolhido por `DATABASE_URL`:

- **`sqlite:./data/fabrica.sqlite`** → desenvolvimento, arquivo local, zero configuração.
- **`postgresql://...`** → produção (Neon, Supabase, Railway, RDS...). SSL é ativado automaticamente
  para hosts remotos.

As tabelas (`settings`, `batch_tiers`, `clients`, `materials`, `quotes`, `audit_logs`) são criadas e
semeadas automaticamente na primeira requisição. Não é necessário rodar migrações.

As consultas usam `?` como marcador (convertido para `$1..$n` no PostgreSQL) e não usam recursos
exclusivos de um banco — por exemplo, a ordenação por nome usa `LOWER(nome)`, que funciona nos dois.

> Em hospedagem serverless o sistema de arquivos é somente leitura — por isso **em produção use
> PostgreSQL** (o plano gratuito da Neon ou do Supabase é suficiente para começar).

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | sim | `sqlite:...` (local) ou `postgresql://...` (produção) |
| `AUTH_SECRET` | sim em produção | Segredo aleatório longo que assina o cookie de sessão |
| `ADMIN_EMAIL` | recomendada | E-mail de acesso ao painel |
| `ADMIN_PASSWORD` | recomendada | Senha inicial (trocada no primeiro login para hash no banco) |
| `NEXT_PUBLIC_COMPANY_NAME` | opcional | Nome exibido na interface (também editável nas Configurações) |

Gere um segredo forte com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deploy na Vercel

O caminho PostgreSQL foi testado com um PostgreSQL 18 real rodando o build de produção
(`next build` + `next start`) e todas as rotas: login, painel, orçamentos (criar, editar,
duplicar, excluir), clientes, materiais, configurações, backup e PDF.

### 1. Criar o banco na nuvem (Neon, gratuito)

1. Acesse [neon.tech](https://neon.tech), crie a conta e um projeto (região mais próxima, ex.: São Paulo).
2. No painel do projeto, abra **Connect** / **Connection string** e copie a string completa,
   que começa com `postgresql://`. Ela já vem com `?sslmode=require`.
3. Guarde essa string: é o valor de `DATABASE_URL`.

> Supabase, Railway e RDS também funcionam: qualquer `postgresql://` serve, desde que aceite SSL.

### 2. Publicar na Vercel

1. Na Vercel: **Add New → Project → Import Git Repository** e escolha este repositório
   (framework detectado: Next.js; não altere build/output).
2. Em **Settings → Environment Variables**, cadastre (marque Production, Preview e Development):

   | Variável | Valor |
   | --- | --- |
   | `DATABASE_URL` | a string `postgresql://...` do passo 1 |
   | `AUTH_SECRET` | segredo aleatório longo (veja o comando abaixo) |
   | `ADMIN_EMAIL` | seu e-mail de acesso |
   | `ADMIN_PASSWORD` | senha inicial forte |

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Deploy**. A primeira requisição cria as tabelas e os dados padrão automaticamente
   (o schema usa advisory lock, então várias instâncias podem inicializar ao mesmo tempo sem duplicar dados).
4. Acesse `/login`, entre com `ADMIN_EMAIL` / `ADMIN_PASSWORD` e troque a senha em
   **Configurações → Segurança**.

### 3. Se algo falhar

- **Erro de conexão / `ECONNREFUSED`**: confira se `DATABASE_URL` foi cadastrada em *todos* os
  ambientes e se a string tem `?sslmode=require`. Depois de mudar variáveis, é preciso **Redeploy**.
- **`self-signed certificate`**: já tratado pelo app (SSL sem validação de CA para hosts remotos).
- **Página em branco ou 500 nas rotas**: veja **Deployments → Functions → Logs** na Vercel.
- **Esqueceu a senha**: altere `ADMIN_PASSWORD` na Vercel e faça um novo deploy; o hash antigo salvo
  no banco continua valendo, então em último caso atualize `settings.admin_password_hash` para `NULL`
  no banco (o sistema volta a usar `ADMIN_PASSWORD`).

## Deploy na Netlify

1. Instale a integração oficial: **Netlify → Add new site → Import an existing project**.
2. Runtime: use o plugin `@netlify/plugin-nextjs` (adicionado automaticamente quando o projeto
   Next.js é detectado; se necessário, `npm i -D @netlify/plugin-nextjs` e declare em `netlify.toml`).
3. Configure as mesmas variáveis de ambiente da Vercel (com `DATABASE_URL` do PostgreSQL).
4. Build command `npm run build`, publish directory `.next`.

> **GitHub Pages** serve apenas arquivos estáticos e não executa API/banco — para este sistema use
> Vercel, Netlify ou qualquer host Node.js (Railway, Render, VPS). O código do GitHub já está pronto
> para os três últimos.

Alternativa com Docker/Node em VPS: `npm ci && npm run build && npm run start` na porta 3000,
com SQLite (volume persistente) ou PostgreSQL.

## Segurança

- **Login administrativo** com hash `scrypt` (nunca senha em texto puro).
- **Cookie de sessão** `httpOnly`, `sameSite=lax`, `secure` em produção, assinado com HMAC-SHA256
  (`AUTH_SECRET`) e validade de 12 horas.
- **Rotas protegidas** em duas camadas: `middleware.ts` redireciona para `/login`, e cada página e
  rota de API valida a assinatura do cookie no servidor.
- **Recálculo no servidor**: os totais nunca são aceitos do navegador — o servidor recalcula tudo
  antes de gravar, impedindo manipulação de preços.
- **Logs de alterações** (`audit_logs`): criação, edição, exclusão, duplicação, login, backup.

## Backup

Em **Configurações → Baixar backup do banco** você baixa um JSON com clientes, materiais,
orçamentos, configurações, faixas e logs (sem o hash da senha).

Para um backup nativo do PostgreSQL:

```bash
pg_dump "$DATABASE_URL" > backup-fabrica-3d.sql
```

Para o SQLite local basta copiar o arquivo `data/fabrica.sqlite`.

## Personalização visual

As cores ficam em `tailwind.config.ts` (`ink`, `brand`, `cloud`) e em `src/app/globals.css`
(classes `.card`, `.btn-primary`, `.input`, `.badge`). O PDF usa as mesmas cores em `src/lib/pdf.ts`.
Para alterar o logo do PDF, ajuste a função `drawLogo` no mesmo arquivo.

---

**Fábrica Da Impressão 3D** — Orçamento válido por 7 dias.
