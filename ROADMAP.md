# Roadmap — Issues GitHub (rascunho)

Use este arquivo como base para criar issues no GitHub depois (`gh issue create`).

---

## ✅ Concluído neste ciclo

| # | Item | Notas |
|---|------|-------|
| 1 | Toast i18n | `resolveToastMessage` no provider |
| 2 | Org switcher mobile | Topbar compact + BottomNav sheet |
| 3 | LanguageSwitcher mobile | No sheet "Mais" |
| 4 | WelcomeModal + onboarding i18n | Keys em `app-*.json` / `onboarding-*.json` |
| 5 | QuickAdd backdrop confirm | Modal de descarte |
| 6 | ModalShell + LogoutModal | Focus trap + Escape |
| 7 | Topbar i18n + trial badge mobile | Banner + chip visível |
| 8 | ConfirmDangerModal tokens | `surface` / `main` / `border` |
| 9 | Paginação expenses/revenues | 25 itens/página |
| 10 | Butler PDF → link relatórios | Remove botão disabled |
| 11 | `/expired` CTA contato | mailto |
| 12 | Activity log server-side | `logActivityAction` |
| 13 | Export logado | `ExportMenu` → `export_data` |
| 14 | Migração org_id | `import_sessions`, `categories` |
| 15 | Cron income_sources | `/api/cron/income-sources` |
| 16 | Rate limit parse-statement | 30 req/min |
| 17 | prefers-reduced-motion | `globals.css` |
| 18 | BottomNav labels business | Tabs principais |
| 19 | **i18n dashboard** | `DashboardPageClient` + ~50 keys em `app-*.json` |
| 20 | **useCachedQuery dashboard** | `lib/dashboardData.ts`, TTL 60s por org+mês |
| 21 | **ModalShell modais** | Customize, ImportReview, CardStatementImport |
| 22 | **i18n widgets dashboard** | AttentionPanel, BudgetsPanel, BuyingPower, SubscriptionRadar |
| 23 | **i18n CRUD** | new/edit expenses & revenues, empty states |
| 24 | **Categorias centralizadas** | `lib/categoryI18n.ts`, `categories-*.json` |
| 25 | **i18n listagens** | expenses/revenues: tabela, batch, export, duplicatas |
| 26 | **CATEGORY_LABELS migrados** | ImportReview, CardStatement, reports, credit-cards, transactionAuditor |
| 27 | **i18n páginas secundárias** | settings, goals, subs, income, projections; headers+empty em import-history, reports, credit-cards |
| 28 | **i18n Butler server-side** | fallback, conforto, alertas assinaturas via cookie `alfred_locale` |
| 29 | **i18n profile + import OFX** | profile completo; import-statement OFX; import-history stats; Butler suspeitas |
| 30 | **i18n corpo reports/cards/projections** | gráficos, modais, Butler Gemini prompt por locale |
| 31 | **i18n export reports + detalhe cartão** | export CSV por locale; `/credit-cards/[id]` completo; labels de mês via `Intl` |
| 32 | **i18n varredura P0** | error/loading boundaries; org ativa; ImportReviewModal; bulk delete modals; fallbacks erro |
| 33 | **Sentry + error boundaries** | `@sentry/nextjs`, `global-error.tsx`, capture em `(app)/error.tsx`; DSN opcional |
| 34 | **i18n CardStatementImportModal** | modal fatura PDF completo; `import.card.*`; `Intl` para mês/moeda |
| 35 | **i18n landing/auth** | `LandingAuthForm`, `LandingHero`, boot/erros em `app/page.tsx`; `authErrorI18n` |

---

## 🔴 Alta prioridade (criar issues)

### Issue: i18n resíduos *(parcial — ver varredura abaixo)*
- **Pendente P0:** *(landing/auth concluído — #35)*
- **Pendente P4:** painel admin (~80 strings)
- **Pendente P5:** `metadata.title` em ~13 layouts
- **Feito (#32):** boundaries, org ativa, ImportReview, bulk delete, fallbacks genéricos
- **Feito (#34):** `CardStatementImportModal` (~50 strings, meses/moeda via `Intl`)
- **Feito (#35):** landing/auth (`LandingAuthForm`, `LandingHero`, `app/page.tsx`, erros Supabase)

### Issue: i18n páginas secundárias *(concluído — #27–#31)*
- **Labels:** `i18n`, `enhancement`
- **Escopo:** `settings`, `goals`, `subscriptions`, `income-sources`, `projections`, `import-statement`, `import-history`, `profile`, `credit-cards`, `reports` (export CSV), `/credit-cards/[id]`
- **Critério:** zero strings PT hardcoded com locale EN ativo

### Issue: i18n Butler server-side *(feito — #28–#30)*
- **Escopo:** `butlerInsightServer.ts` — fallback, conforto, suspeitas, prompt Gemini por `alfred_locale`

---

## 🟡 Média prioridade

### Issue: Stripe + upgrade pós-trial
- **Labels:** `product`, `billing`
- **Escopo:** webhook, planos, liberar `/expired` com checkout
- **Depende:** definição de preços

### Issue: Colaboração org business (RLS + convites)
- **Labels:** `product`, `security`, `database`
- **Escopo:** membros veem dados da org; fluxo de convite por e-mail
- **Nota:** RLS atual exige `user_id = auth.uid()`

### Issue: PDF relatório Butler (Gemini ou server-side)
- **Labels:** `feature`
- **Alternativa:** manter link para `/reports` (já feito)

### Issue: Monitoramento (Sentry) + error boundaries *(feito — #33)*
- **Escopo:** `@sentry/nextjs`, `instrumentation.ts`, `global-error.tsx`, capture em `(app)/error.tsx`
- **Ativar:** definir `NEXT_PUBLIC_SENTRY_DSN` no `.env.local` / Vercel

### Issue: Gerar types Supabase via CI
- **Labels:** `dx`, `database`
- **Comando:** `supabase gen types typescript`

---

## 🟢 Backlog

- Admin dashboard com MRR real (Stripe)
- Paginação server-side quando volume > 1000 linhas
- Cache offline seletivo (metas, último mês) no PWA
- Testes E2E Playwright (auth, import, CRUD)
- Documentar `docs/AUDITORIA_RLS.md` com modelo multi-org

---

## Comandos para criar issues (depois)

```bash
gh issue create --title "i18n: páginas secundárias" --body-file .github/issue-templates/i18n-secondary.md --label enhancement
```

Ou copiar cada seção acima manualmente no GitHub.
