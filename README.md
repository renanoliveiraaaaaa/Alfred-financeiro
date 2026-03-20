# Alfred Financeiro

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-gold?style=flat-square" alt="License" />
</p>

---

> **Assistente financeiro pessoal de elite** — inspirado na lealdade e eficiência de um mordomo britânico, o Alfred Financeiro cuida do seu patrimônio com discrição, organização e precisão. Um sistema completo para quem exige excelência na gestão das finanças pessoais.

---

## Visão Geral

O Alfred Financeiro é um SaaS de gestão financeira pessoal que combina interface refinada, funcionalidades avançadas e uma experiência de uso única — a *Voz do Alfred* — que guia o usuário com linguagem formal e cortês em cada interação.

### Funcionalidades Principais

| Recurso | Descrição |
|---------|-----------|
| **Dashboard inteligente** | Visão geral do patrimônio com saldo do mês, entradas, saídas, orçamento, últimas movimentações e compromissos pendentes. Inclui **modo privacidade** para ocultar valores em ambientes compartilhados. |
| **Gestão de Despesas** | Cadastro completo com auto-categorização, parcelamento (incluindo lógica de fechamento de cartão), upload de faturas, filtros por categoria/status e ações em massa (marcar como pagas, excluir). |
| **Gestão de Receitas** | Controle de entradas com data esperada, toggle de recebido e edição/exclusão individual. |
| **Cartões de Crédito** | Interface visual com gradientes, bandeiras (Visa, Mastercard, Elo, Amex), chip, faturas por mês, pagamento de fatura completa e CRUD completo. |
| **Assinaturas** | Controle de serviços recorrentes (mensal/anual) com alertas de renovação no dashboard e registro rápido de saída. |
| **Fontes de Renda** | Gestão de receitas recorrentes (mensal, quinzenal, semanal) com alertas de recebimento do dia e confirmação em um clique. |
| **Cofres (Metas)** | Metas financeiras de longo prazo com barra de progresso, aportes e prazo opcional. |
| **Orçamento e Projeções** | Metas mensais de despesas e receitas, acompanhamento de projeção vs. realizado. |
| **Relatórios Visuais** | Gráficos mensais e anuais com Chart.js (pizza, barras, linhas), evolução do patrimônio e análise por categoria. |
| **Importar extrato** | Upload de **CSV** ou **OFX/QFX** para revisar e importar despesas/receitas em lote (sem suporte a PDF de extrato — ver [docs/THEMES_GLASS_MODALS_IMPORT.md](docs/THEMES_GLASS_MODALS_IMPORT.md)). |
| **Interface Dark/Light** | Modo claro/escuro via `next-themes`, além da **galeria de temas** no perfil (Padrão, Gala, Classic, Club, Liquid Glass). |
| **Animações** | Framer Motion para transições de página, modais e feedback visual. |
| **Lançamentos** | Novas despesas/receitas pelas rotas dedicadas (ex.: `/expenses/new`, `/revenues/new`) e atalhos no dashboard. |
| **Free Trial SaaS** | Período de teste gratuito; badge de dias restantes na Topbar só quando faltam **7 dias ou menos**; bloqueio ao expirar com página dedicada. |
| **Onboarding** | Seed automático de categorias para novos usuários e modal de boas-vindas. |
| **Tratamento de Erros** | Toasts globais, mensagens de conexão e feedback visual em todas as operações CRUD. |

---

## Tech Stack

| Camada | Tecnologia |
|--------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Linguagem** | TypeScript 5.3 |
| **Estilização** | Tailwind CSS 3.4 |
| **Backend / Auth / DB** | Supabase (PostgreSQL, Auth, Storage) |
| **Gráficos** | Chart.js 4.5 + react-chartjs-2 |
| **Animações** | Framer Motion 12 |
| **Ícones** | Lucide React |
| **Temas** | next-themes |

---

## Arquitetura de Dados (O Banco)

O sistema utiliza o Supabase (PostgreSQL) com as seguintes tabelas principais:

| Tabela | Propósito |
|--------|-----------|
| `users` | Usuários do Supabase Auth (id, email, created_at) |
| `profiles` | Perfil estendido (full_name, avatar_url, plan_status, trial_ends_at) vinculado ao usuário |
| `revenues` | Receitas (valor, descrição, data, data esperada, recebido) |
| `expenses` | Despesas (valor, descrição, categoria, forma de pagamento, parcelas, vencimento, pago, fatura, cartão) |
| `categories` | Categorias personalizadas por usuário |
| `credit_cards` | Cartões de crédito (nome, limite, dia de fechamento, dia de vencimento, bandeira, cor) |
| `subscriptions` | Assinaturas (nome, valor, ciclo, próxima cobrança, ativo) |
| `income_sources` | Fontes de renda (nome, valor, frequência, próxima data, ativo) |
| `goals` | Metas/Cofres (nome, valor alvo, valor atual, prazo, cor, ícone) |
| `projections` | Projeções mensais (despesas/receitas projetadas vs. realizadas) |
| `import_sessions` | Sessões de importação de extrato (arquivo, banco, período, totais); vínculo opcional em `revenues`/`expenses` via `import_session_id` e coluna `source` |

> **Importação:** formatos aceitos **CSV / OFX / QFX**. PDF não é usado para extrato em massa (apenas comprovantes em despesas). Detalhes em [docs/THEMES_GLASS_MODALS_IMPORT.md](docs/THEMES_GLASS_MODALS_IMPORT.md).

---

## Guia de Instalação (Setup)

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)

### Passo a passo

1. **Clone o repositório**
   ```bash
   git clone https://github.com/seu-usuario/alfred-financeiro.git
   cd alfred-financeiro
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   
   Copie o arquivo de exemplo e preencha com suas credenciais do Supabase:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edite `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_publica
   ```
   
   > As chaves estão disponíveis em: **Supabase Dashboard → Project Settings → API**

4. **Configure o banco de dados**
   
   **Ambiente novo:** Execute o arquivo `SUPABASE_SCHEMA.sql` completo no Supabase SQL Editor (se existir).
   
   **Migrações incrementais:** Execute no **Supabase Dashboard** → **SQL Editor** (em ordem):
   
   - `supabase/migrations/20260218000000_income_sources.sql` — tabelas base
   - `supabase/migrations/20260218010000_rls_audit.sql` — políticas RLS
   - `supabase/migrations/20260218100000_free_trial_saas.sql` — colunas trial (plan_status, trial_ends_at)
   - `supabase/migrations/20260218100001_update_existing_profiles_trial.sql` — atualização de perfis existentes
   - `supabase/migrations/20260318000000_schema_sync.sql` — sincronização schema (se existir)
   - `supabase/migrations/20260318100000_profiles_gender_app_theme.sql` — `gender`, `app_theme` em `profiles`
   - `supabase/migrations/20260318100001_update_existing_profiles_gender_theme.sql` — dados legados
   - `supabase/migrations/20260318100002_app_theme_galeria.sql` — temas `gala`, `classic`, `club` (substitui `alfred`)
   - `supabase/migrations/20260319100000_add_liquid_theme.sql` — valor `liquid` em `app_theme`
   - `supabase/migrations/20260319200000_import_statements.sql` — `import_sessions`, `source` e `import_session_id` em receitas/despesas
   
   Ou utilize `supabase db push` se preferir o CLI.
   
   > **Nota sobre geração de tipos:** Para regenerar `types/supabase.ts` a partir do schema real: `npx supabase gen types typescript --project-id SEU_PROJECT_ID > types/supabase.ts`

5. **Inicie o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```
   
   Acesse [http://localhost:3000](http://localhost:3000).

6. **Build para produção**
   ```bash
   npm run build
   npm start
   ```

---

## Histórico de Mudanças no Schema

### v3 — Documentação de temas, Liquid Glass e importação (2026-03)

- Guia **[docs/THEMES_GLASS_MODALS_IMPORT.md](docs/THEMES_GLASS_MODALS_IMPORT.md)** cobre `app_theme`, efeito vidro Liquid, modais com Portal e extratos CSV/OFX.
- Ajustes visuais do tema Liquid: superfícies translúcidas, blur em `bg-surface`, `LiquidBackground` e layout transparente na área principal.

### v2 — Sincronização Schema × Código (2026-03-18)

As seguintes inconsistências entre o `SUPABASE_SCHEMA.sql` e o código da aplicação foram corrigidas:

| # | Problema | Solução |
|---|----------|---------|
| 1 | Tabelas `credit_cards`, `subscriptions`, `goals` ausentes no SQL | Adicionadas ao `SUPABASE_SCHEMA.sql` com colunas, índices, RLS e políticas |
| 2 | Tabela `profiles` ausente no SQL e em `types/supabase.ts` | Criada com `id` (PK/FK para `auth.users`), `full_name`, `avatar_url`; adicionada ao `types/supabase.ts`; trigger automático na criação de usuário |
| 3 | Coluna `credit_card_id` ausente em `expenses` no SQL | Adicionada como FK opcional para `credit_cards(id)` com `ON DELETE SET NULL` |
| 4 | CHECK de `expenses.category` cobria apenas 4 categorias (`mercado`, `combustivel`, `manutencao_carro`, `outros`) | Expandido para cobrir todas as categorias usadas no frontend: `mercado`, `combustivel`, `manutencao_carro`, `alimentacao`, `transporte`, `assinaturas`, `saude`, `educacao`, `lazer`, `moradia`, `outros` |

#### Arquivos alterados

- `SUPABASE_SCHEMA.sql` — schema completo e corrigido para novos ambientes
- `supabase/migrations/20260318000000_schema_sync.sql` — migração incremental para ambientes existentes
- `types/supabase.ts` — adicionada definição de `profiles`
- `README.md` — documentação atualizada

---

## Manifesto de Design (UI/UX)

### A Voz do Alfred

O Alfred comunica-se com o usuário de forma **formal e cortês**, como um mordomo britânico. Exemplos:

- *"Boa noite, senhor"* — saudação no dashboard
- *"Tudo em ordem no momento, senhor"* — estado vazio
- *"Todas as obrigações estão em dia, senhor. Excelente gestão."* — feedback positivo
- *"Deixando a Mansão?"* — confirmação de logout
- *"À sua disposição"* — área do perfil

Essa voz deve ser mantida em textos de interface, mensagens de erro e tooltips para preservar a identidade do produto.

### Paleta Wayne Tech / Tuxedo

| Token | Uso |
|-------|-----|
| **manor** (50–950) | Tons neutros base (cinzas sofisticados) |
| **gold** (50–900) | Destaques, CTAs, links, estados ativos |
| **silver** | Elementos secundários e bordas sutis |

- **Tema Tuxedo (dark)**: `manor-900`, `manor-950` como fundos; `gold-400/500` para destaques.
- **Tema Morning Suit (light)**: fundos claros, `gold-600/700` para CTAs.

### Temas de aparência e Liquid Glass

No **Perfil**, o usuário escolhe a paleta (`app_theme`): Padrão, Gala, Classic, Club ou **Liquid Glass**. As variáveis CSS em `app/globals.css` definem `--surface`, `--brand`, etc. O tema **Liquid** usa superfícies translúcidas, `backdrop-filter` e o componente `LiquidBackground` (blobs animados). Documentação completa: [docs/THEMES_GLASS_MODALS_IMPORT.md](docs/THEMES_GLASS_MODALS_IMPORT.md).

---

## Estrutura do Projeto

```
finance-manager/
├── app/
│   ├── (app)/              # Rotas autenticadas (layout com Sidebar + Topbar)
│   │   ├── dashboard/
│   │   ├── expenses/
│   │   ├── revenues/
│   │   ├── credit-cards/
│   │   ├── goals/
│   │   ├── subscriptions/
│   │   ├── income-sources/
│   │   ├── projections/
│   │   ├── reports/
│   │   ├── import-statement/ # Importação CSV/OFX de extratos
│   │   ├── settings/
│   │   ├── profile/
│   │   └── expired/         # Página de trial expirado (sem Sidebar/Topbar)
│   ├── api/
│   │   ├── cron/subscriptions/
│   │   └── parse-statement/ # Parse de extrato no servidor
│   ├── layout.tsx
│   └── page.tsx            # Login
├── components/
│   ├── Topbar.tsx
│   ├── Sidebar.tsx
│   ├── AppLayoutClient.tsx  # Layout com verificação de trial
│   ├── MaskedValue.tsx      # Modo privacidade
│   ├── CardBrandIcon.tsx
│   ├── CardChipIcon.tsx
│   ├── QuickAddModal.tsx
│   ├── LiquidBackground.tsx  # Fundo animado (tema Liquid)
│   ├── ThemeApplier.tsx      # Classe theme-* no <html>
│   ├── ImportReviewModal.tsx
│   ├── ConfirmDangerModal.tsx
│   ├── EmptyState.tsx
│   ├── WelcomeModal.tsx
│   ├── Spinner.tsx
│   ├── AnimatedPage.tsx
│   └── Providers.tsx
├── lib/
│   ├── supabaseClient.ts
│   ├── supabaseServer.ts
│   ├── privacyContext.tsx
│   ├── toastContext.tsx    # Toasts e tratamento de erros
│   ├── seedCategories.ts   # Seed de categorias para onboarding
│   ├── format.ts
│   ├── installments.ts
│   └── actions/
│       └── import-statement.ts
├── lib/parsers/            # CSV/OFX por banco (Nubank, Inter, genérico)
├── docs/
│   ├── AUDITORIA_RLS.md
│   ├── FREE_TRIAL_SAAS.md
│   └── THEMES_GLASS_MODALS_IMPORT.md  # Temas, Liquid Glass, modais, importação
├── supabase/
│   └── migrations/         # Scripts SQL (RLS, Free Trial, etc.)
├── types/
│   └── supabase.ts
└── tailwind.config.ts
```

---

## Documentação Adicional

| Documento | Conteúdo |
|-----------|----------|
| [docs/AUDITORIA_RLS.md](docs/AUDITORIA_RLS.md) | Políticas RLS, tabelas protegidas e revisão do frontend |
| [docs/FREE_TRIAL_SAAS.md](docs/FREE_TRIAL_SAAS.md) | Free Trial de 7 dias, migrações e como estender acesso |
| [docs/THEMES_GLASS_MODALS_IMPORT.md](docs/THEMES_GLASS_MODALS_IMPORT.md) | Temas (`app_theme`), Liquid Glass, modais (Portal + z-index), importação CSV/OFX e tabela `import_sessions` |

---

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Inicia o servidor de produção |
| `npm run lint` | Executa o ESLint |

---

## Licença

MIT — Use, modifique e distribua com liberdade.

---

<p align="center">
  <em>À sua disposição, senhor.</em> 🎩
</p>
