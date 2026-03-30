# NR-1 EACT — Avaliação de Riscos Psicossociais

Aplicação para avaliação dos riscos psicossociais da empresa usando a **Escala EACT**, com geração automática de plano de ação por IA (Claude), em conformidade com a **NR-1** do Ministério do Trabalho e Emprego.

## Fluxo

1. **Empresário se cadastra** com dados da empresa
2. **Recebe um link exclusivo** para distribuir aos funcionários
3. **Funcionários respondem** a pesquisa EACT de forma anônima (31 questões, escala 1-5)
4. **Empresário gera o relatório** com diagnóstico por dimensão e plano de ação criado por IA

## Tecnologias

- **Next.js 14** (App Router)
- **Prisma + SQLite** (banco de dados)
- **Tailwind CSS** (estilo)
- **Claude API** (Anthropic) — geração do plano de ação

## Setup

### 1. Pré-requisitos

- Node.js 18+ instalado: https://nodejs.org
- Conta na Anthropic para a API key: https://console.anthropic.com

### 2. Instalar dependências

```bash
cd nr1-eact
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione sua `ANTHROPIC_API_KEY`.

### 4. Criar banco de dados

```bash
npm run db:push
```

### 5. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

## Estrutura do projeto

```
src/
  app/
    page.tsx                   # Landing + cadastro de empresa
    empresa/[id]/page.tsx      # Dashboard do empresário
    pesquisa/[token]/page.tsx  # Formulário para funcionários
    relatorio/[id]/page.tsx    # Relatório com plano de ação
    api/
      empresa/route.ts         # POST cadastro / GET busca empresa
      pesquisa/route.ts        # GET info empresa / POST submete respostas
      relatorio/route.ts       # POST gera relatório / GET busca relatório
  lib/
    questions.ts               # 31 questões EACT + dimensões
    scoring.ts                 # Cálculo de médias e classificação
    prisma.ts                  # Cliente Prisma
    ai.ts                      # Geração do plano de ação com Claude
prisma/
  schema.prisma                # Schema do banco (Empresa, Resposta, Relatorio)
```

## Critérios de classificação EACT

| Média | Classificação |
|-------|--------------|
| ≥ 3,7 | 🔴 Grave — Ação imediata necessária |
| 2,3 – 3,69 | 🟡 Crítico — Requer melhoria |
| < 2,3 | 🟢 Satisfatório |

## Deploy

Para colocar em produção, recomendamos:
- **Vercel** (gratuito, integração nativa com Next.js)
- Trocar SQLite por **PostgreSQL** (ex: Neon, Supabase) — altere `DATABASE_URL` e o provider no `schema.prisma`
