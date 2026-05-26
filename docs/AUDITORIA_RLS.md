# Auditoria de Segurança — Row Level Security (RLS)

> Última revisão: maio/2026 · alinhado às migrations até `20260522140000_categories_import_sessions_org_rls.sql`

## Resumo

O Alfred usa **Supabase RLS** para isolar dados entre utilizadores. Desde a migração multi-org (`20260329100000`), a maioria das entidades financeiras exige:

1. **`user_id = auth.uid()`** — só o autor da linha acede (modelo actual *single-owner por linha*)
2. **`organization_id` + membership** — a linha pertence a uma org da qual o utilizador é membro

Isto permite **contexto Pessoal vs Business** (switcher de org) sem partilha de linhas entre utilizadores da mesma org — ver [Limitações conhecidas](#limitações-conhecidas--próximos-passos).

---

## Modelo multi-organização

```mermaid
flowchart TB
  subgraph auth [Auth]
    U[auth.users]
  end
  subgraph org [Organizações]
    P[profiles]
    O[organizations]
    OM[organization_members]
  end
  subgraph data [Dados financeiros]
    E[expenses / revenues]
    CC[credit_cards / goals / …]
  end
  U --> P
  P -->|trigger: org personal| O
  P --> OM
  O --> OM
  E --> O
  E --> U
```

| Conceito | Descrição |
|----------|-----------|
| **Org `personal`** | Criada automaticamente no registo (`trg_profiles_create_personal_org`). Uma por `owner_id`. |
| **Org `business`** | Criada pelo utilizador (`createBusinessOrganization`). Dados separados da org pessoal. |
| **Membership** | `organization_members(profile_id, organization_id, role)` — roles: `owner`, `admin`, `member`. |
| **Org ativa (UI)** | Cookie `alfred.activeOrganizationId` + `localStorage` (`OrganizationSwitcher`). Server: `resolveActiveOrganizationId()`. |

---

## Regra RLS típica (dados financeiros)

Migrations: `20260401120000`, `20260406120000`, `20260407120000`.

```sql
-- Exemplo: expenses (padrão repetido em revenues, subscriptions, credit_cards, goals, income_sources, projections)
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = expenses.organization_id
      AND om.profile_id = auth.uid()
  )
);
```

**Leitura:** o utilizador só vê/edita linhas que **criou** (`user_id`) **e** que pertencem a uma org onde é membro.

---

## Tabelas e políticas

### Dados financeiros — `user_id` + `organization_id` + membership

| Tabela | RLS | `organization_id` NOT NULL | Políticas CRUD org |
|--------|-----|------------------------------|---------------------|
| `expenses` | ✅ | ✅ | ✅ |
| `revenues` | ✅ | ✅ | ✅ |
| `subscriptions` | ✅ | ✅ | ✅ |
| `credit_cards` | ✅ | ✅ | ✅ |
| `goals` | ✅ | ✅ | ✅ |
| `income_sources` | ✅ | ✅ | ✅ |
| `projections` | ✅ | ✅ | ✅ (unique por `user_id, organization_id, month`) |

### Organizações

| Tabela | RLS | Regra principal |
|--------|-----|-----------------|
| `organizations` | ✅ | SELECT se membro; INSERT se `owner_id = auth.uid()`; UPDATE se owner |
| `organization_members` | ✅ | SELECT da própria linha (`profile_id = auth.uid()`) — evita recursão RLS |

### Perfil e admin

| Tabela | RLS | Regra principal |
|--------|-----|-----------------|
| `profiles` | ✅ | Utilizador vê/edita o próprio perfil; admins via `is_app_admin()` |
| Função `is_app_admin()` | — | `SECURITY DEFINER`, evita recursão infinita em políticas admin (`20260405120000`) |

Admins têm **SELECT global** (telemetria) em: `expenses`, `revenues`, `subscriptions`, `credit_cards`, `import_sessions`, `organizations`, `organization_members` — ver `20260328120000`, `20260405120000`.

### Importação e categorias — org scope parcial

| Tabela | `organization_id` | RLS actual | Notas |
|--------|-------------------|------------|-------|
| `import_sessions` | ✅ | ✅ NOT NULL | ✅ user_id + membership |
| `categories` | ✅ | ✅ NOT NULL | ✅ user_id + membership |

### Activity log

| Tabela | RLS | Regra |
|--------|-----|-------|
| `activity_logs` | ✅ | SELECT/INSERT só `user_id = auth.uid()`; CHECK em `action` (`20260522130000`) |

Ações válidas: `login`, `logout`, `profile_update`, `export_data`, `delete_records`, `2fa_enroll`, `2fa_unenroll`, `password_change`, `account_delete`, `settings_change`.

---

## Camada de aplicação (Next.js)

### Credenciais

- Browser/server: apenas `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **`SUPABASE_SERVICE_ROLE_KEY`**: só em cron/API server-side — nunca no cliente

### Resolução de org ativa

| Camada | Ficheiro | Comportamento |
|--------|----------|---------------|
| Server actions | `lib/activeOrganizationServer.ts` | Cookie → membership; fallback org `personal` |
| Client | `lib/activeOrganizationClient.ts` | localStorage → membership; fallback org `personal` |
| Middleware | `middleware.ts` | Auth + trial expirado; **não** valida org |

### Rotas protegidas

Middleware exige sessão em: `/dashboard`, `/expenses`, `/revenues`, `/projections`, `/reports`, `/credit-cards`, `/goals`, `/income-sources`, `/subscriptions`, `/settings`, `/profile`, `/expired`, `/import-statement`, `/import-history`, `/admin/*`.

---

## Como aplicar / verificar migrations

```bash
# Local (Docker + Supabase CLI)
supabase db push

# Validar types alinhados ao schema
npm run validate:types
```

Checklist pós-deploy:

1. Novo registo cria org `personal` + membership `owner`
2. Switcher business/personal altera dados visíveis no dashboard
3. Utilizador A **não** vê linhas de utilizador B (mesmo org business)
4. Admin vê telemetria em `/admin/dashboard`

---

## Limitações conhecidas / próximos passos

| Item | Estado | Issue roadmap |
|------|--------|---------------|
| Colaboração real (membros veem dados da org) | ❌ RLS exige `user_id = auth.uid()` | Colaboração org business |
| Convites por e-mail | ❌ não implementado | Colaboração org business |
| RLS `categories` / `import_sessions` por membership | ✅ `20260522140000` | — |
| Stripe / planos pagos | ❌ depende preços | Stripe pós-trial |

---

## Referência de migrations (ordem relevante)

| Migration | Conteúdo |
|-----------|----------|
| `20260218010000_rls_audit.sql` | RLS base `user_id` |
| `20260329100000_organizations_multitenant.sql` | Orgs, members, trigger personal |
| `20260401120000_expenses_revenues_organization_rls.sql` | Org em expenses/revenues |
| `20260406120000_financial_entities_organization_id_rls.sql` | Org em subs, cards, goals, income |
| `20260407120000_projections_organization_id_rls.sql` | Org em projections |
| `20260405120000_rls_is_app_admin_no_recursion.sql` | `is_app_admin()` |
| `20260522120000_advanced_features.sql` | `activity_logs`, locale/theme |
| `20260522130000_org_scope_and_activity_check.sql` | Org em import_sessions/categories; CHECK activity |
| `20260522140000_categories_import_sessions_org_rls.sql` | NOT NULL + RLS membership em categories/import_sessions |

---

## Revisão frontend (checklist)

- [x] Anon key no cliente; service role só server/cron
- [x] Server actions usam `createSupabaseServerClient()` (sessão do cookie)
- [x] Org ativa propagada em inserts recentes (import, categories, CRUD)
- [x] Middleware bloqueia rotas sem auth
- [ ] Testes E2E de isolamento entre utilizadores (backlog)
- [x] Migration RLS categories/import_sessions por membership (`20260522140000`)
