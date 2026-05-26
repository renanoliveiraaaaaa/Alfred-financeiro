# Testes E2E (Playwright)

## Comandos

```bash
npm run test:e2e          # headless
npm run test:e2e:ui       # interface interativa
npm run test:e2e:report   # abrir relatório HTML
```

O `playwright.config.ts` arranca `npm run dev` automaticamente (porta 3000), salvo se `PLAYWRIGHT_BASE_URL` estiver definido.

## Suites

| Ficheiro | O que cobre | Requer Supabase real |
|----------|-------------|----------------------|
| `e2e/smoke.spec.ts` | Landing, `/privacidade`, redirects, convite | Não |
| `e2e/auth-ui.spec.ts` | Tabs login/registo, UI esqueceu senha | Não |
| `e2e/auth.spec.ts` | Login, logout, despesas/receitas, settings | `E2E_TEST_*` |
| `e2e/auth.spec.ts` (live) | Envio esqueceu senha | `E2E_LIVE_AUTH=1` + Supabase real |

## Variáveis (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Opcional — testes integrados (auth.spec.ts)
E2E_TEST_EMAIL=conta-de-teste@exemplo.com
E2E_TEST_PASSWORD=senha-segura

# Opcional — testar contra deploy remoto
# PLAYWRIGHT_BASE_URL=https://alfred-financeiro.vercel.app
```

## CI

O job `e2e` no `.github/workflows/ci.yml` corre smoke + auth UI com credenciais placeholder. Testes que exigem Supabase real ou `E2E_TEST_*` são ignorados (`test.skip`).

## Próximos passos sugeridos

- Import OFX/PDF com fixture de ficheiro
- Aceitar convite org (seed + token de teste)
- Stripe checkout pós-trial
