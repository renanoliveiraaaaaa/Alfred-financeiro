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

---

## 🔴 Alta prioridade (criar issues)

### Issue: i18n dashboard e CRUD completo
- **Labels:** `i18n`, `enhancement`
- **Escopo:** `DashboardPageClient`, páginas new/edit, `AttentionPanel`, `EmptyState` defaults, categorias
- **Critério:** zero strings PT hardcoded com locale EN ativo

### Issue: Adotar useCachedQuery no dashboard
- **Labels:** `performance`
- **Escopo:** cache por `orgId+month` em `DashboardPageClient`
- **Critério:** trocar mês sem flash de loading se TTL válido

### Issue: Padronizar todos os modais com ModalShell
- **Labels:** `a11y`, `refactor`
- **Escopo:** `ImportReviewModal`, `DashboardCustomizeModal`, `WelcomeModal`, org create
- **Critério:** focus trap + Escape + tokens em 100% dos modais

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

### Issue: Monitoramento (Sentry) + error boundaries
- **Labels:** `ops`, `reliability`

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
gh issue create --title "i18n: dashboard e CRUD completo" --body-file .github/issue-templates/i18n-dashboard.md --label enhancement
```

Ou copiar cada seção acima manualmente no GitHub.
