# Tarefas Pendentes

Todas as pendências principais foram implementadas:

- ~~Internacionalização avançada~~ ✅ (I18nProvider expandido, locales onboarding/errors/security, seletor no perfil, detecção do navegador)
- ~~Onboarding guiado~~ ✅
- ~~Dashboard personalizável~~ ✅
- ~~Performance~~ ✅ (`useCachedQuery` + lazy load de gráficos em relatórios)
- ~~Acessibilidade avançada~~ ✅ (`useFocusTrap`, SkipLink, ARIA em modais/gráficos/tabelas)
- ~~Exportação de dados~~ ✅
- ~~Notificações por e-mail~~ ✅ (`/api/cron/notifications` + Resend + lembretes de vencimento)
- ~~Segurança (2FA + log)~~ ✅ (TwoFactorPanel Supabase MFA + `activity_logs`)
- ~~Mobile PWA~~ ✅ (service worker, manifest, InstallPrompt, página offline)
- ~~Temas customizáveis~~ ✅ (`CustomThemeEditor` + `custom_theme` no perfil)

## Configuração adicional

- Aplicar migração `20260522120000_advanced_features.sql` no Supabase
- Definir `RESEND_API_KEY` e `EMAIL_FROM` para e-mails reais (sem chave, cron roda em modo stub/log)
- Definir `NEXT_PUBLIC_APP_URL` para links nos e-mails
- Habilitar MFA no projeto Supabase (Authentication → MFA)
