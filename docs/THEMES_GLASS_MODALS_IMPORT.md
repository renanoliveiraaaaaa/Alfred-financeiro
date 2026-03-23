# Temas, Liquid Glass, modais e importação de extratos

Documentação técnica para desenvolvedores e IAs de contexto.

---

## 1. Sistema de temas (`app_theme`)

O perfil do usuário (`profiles.app_theme`) define a **paleta institucional** (variáveis CSS), independente do **modo claro/escuro** (`next-themes` → classe `.dark` no `<html>`).

| Valor | Classe no `<html>` | Descrição |
|-------|-------------------|-----------|
| `normal` | *(nenhuma)* | Padrão institucional (azul / slate) |
| `gala` | `theme-gala` | Zinc + dourado |
| `classic` | `theme-classic` | Stone + âmbar |
| `club` | `theme-club` | Slate/esmeralda |
| `liquid` | `theme-liquid` | Glassmorphism (vidro) |

**Arquivos principais**

- `app/globals.css` — variáveis `--background`, `--surface`, `--border`, `--text-main`, `--text-muted`, `--brand` por tema.
- `tailwind.config.ts` — cores semânticas (`background`, `surface`, `border`, etc.) apontando para essas variáveis.
- `components/ThemeApplier.tsx` — aplica/remove `theme-*` no `<html>` conforme `UserPreferencesContext`.
- `lib/userPreferencesContext.tsx` — tipo `AppTheme` e persistência no Supabase.

**Migrações relacionadas**

- `20260318100000_profiles_gender_app_theme.sql` — colunas `gender`, `app_theme`.
- `20260318100002_app_theme_galeria.sql` — valores `normal`, `gala`, `classic`, `club` (migra `alfred` → `classic`).
- `20260319100000_add_liquid_theme.sql` — inclui `liquid` no `CHECK` de `app_theme`.

---

## 2. Tema Liquid Glass

Objetivo: superfícies **semi-transparentes** com **backdrop blur** e fundo **colorido animado** (estilo iOS / glassmorphism).

### Variáveis (`.theme-liquid`)

- **Claro:** `--surface: rgba(255, 255, 255, 0.4)`; `--border: rgba(255, 255, 255, 0.3)`.
- **Escuro:** `--surface: rgba(0, 0, 0, 0.4)`; `--border: rgba(255, 255, 255, 0.1)`.

### Blur em cards e superfícies Tailwind

Em `globals.css`, sob `.theme-liquid`:

- Seletores `.bg-surface` e `[class*="bg-surface/"]` recebem `backdrop-filter: blur(...)` + `saturate(...)`.
- `main` fica com fundo **transparente** para o fundo animado aparecer entre os cards.
- `.app-layout.glass-background` com fundo transparente; gradiente leve opcional.
- `.glass-sidebar` / `.glass-topbar` — blur reforçado e fundo alinhado a `--glass-bg`.

### Fundo animado

- `components/LiquidBackground.tsx` — renderizado só se `appTheme === 'liquid'`.
- `fixed inset-0 z-0`, `pointer-events-none`, blobs (ciano, fúcsia, violeta, rosa, etc.) com `blur-3xl` e animações CSS (`animate-liquid-*-pulse` em `globals.css`).
- `components/AppLayoutClient.tsx` — `relative z-0` no layout; coluna principal `relative z-10` para empilhar acima do fundo.

---

## 3. Modais e z-index

**Problema:** Topbar (`z-40`) e Sidebar (`z-50`) geravam *stacking contexts*; modais com `z-50` dentro do layout ficavam **atrás** da navegação.

**Solução:**

- `createPortal(..., document.body)` para o conteúdo do modal.
- Overlay com `fixed inset-0 z-[999]`.

**Componentes / páginas afetados (exemplos):** `QuickAddModal`, `ConfirmDangerModal`, `WelcomeModal`, modal de logout na `Topbar`, modais inline em `subscriptions`, `settings`, `credit-cards`, `goals`, `income-sources`.

**Importante:** `createPortal` exige **dois** argumentos: `(jsx, document.body)`. Falta de import de `react-dom` ou segundo argumento quebra o `next build`.

---

## 4. Importação de extratos (histórico)

### Formatos aceitos

- **CSV** e **OFX/QFX** apenas (definido em `app/(app)/import-statement/page.tsx` → `ACCEPT = '.csv,.ofx,.qfx'`).
- **Não há** parser de **PDF** para importação em massa de lançamentos. PDF no app é usado em **comprovantes de despesa** (upload em formulários de despesa), não no fluxo de extrato.

### Parsers

- `lib/parsers/index.ts` — roteamento por banco + extensão (`nubank`, `inter`, `generic` CSV; OFX universal).
- API: `app/api/parse-statement/route.ts`.
- UI de revisão: `components/ImportReviewModal.tsx`.

### Heurísticas de tipo de lançamento (`lib/importHeuristics.ts`)

Depois do parse, **todas** as transações passam por `enrichParsedTransactions`:

- Tenta classificar o texto em tipos como **pagamento de fatura de cartão**, **boleto**, **PIX** (enviado vs recebido), **TED/DOC/transferência**, **saque**, **tarifa bancária**, **investimentos** (padrões comuns em português BR).
- Preenche **`import_hint`** (selo no modal de revisão) e **`suggested_payment_method`** para despesas (ex.: fatura paga na conta corrente → sugestão **Débito**; saque → **Espécie**).
- **Não** associa a um cartão cadastrado no app (`credit_card_id`): o extrato quase nunca traz esse vínculo; o usuário pode editar a despesa depois se precisar.

Textos genéricos ou bancos com descrições atípicas podem não casar — a revisão manual continua essencial.

### Banco de dados

**Migration:** `20260319200000_import_statements.sql`

- Tabela `public.import_sessions` (sessão de importação por usuário).
- Colunas em `revenues` e `expenses`: `source` (default `'manual'`), `import_session_id` (FK opcional para `import_sessions`).

RLS em `import_sessions` com políticas por `auth.uid() = user_id`.

### Problema: modal de revisão vazio após “Processar extrato”

O `ImportReviewModal` monta junto com a página **antes** de existir transações (`transactions=[]`). O estado interno (`rows`) era inicializado uma única vez com esse array vazio e **não** era atualizado quando o parse retornava dados — a tabela ficava vazia e o botão podia mostrar `Confirmar undefined/`.

**Correção:** sincronizar `rows` e `activeMonth` com `useLayoutEffect` sempre que `open` e `transactions` mudarem após o parse.

### Parser OFX

Alguns extratos usam tags com **namespace** (`<OFX:STMTTRN>`), **PAYEE** em vez de NAME, ou MEMO vazio. O parser aceita prefixos opcionais, PAYEE e descrição fallback (`Ref. FITID` ou `Lançamento OFX (data)`).

#### Itaú (BANKID 0341 / OFX 102 SGML)

Muitos arquivos marcam **todas** as linhas como `<TRNTYPE>CREDIT` com **valor positivo**, inclusive saídas. O parser:

1. Usa **sinal negativo** em `TRNAMT` e tipos `DEBIT` / etc. quando existirem.
2. Reconhece **MEMO** típicos de entrada (`REND PAGO APLIC`, `DEV PIX`, `PIX ORIGEM CARTAO`, …) e de saída (`PAGAMENTO`, `BOLETO`, `FATURA`, …).
3. Se o arquivo tem **BANKID Itaú** ou o usuário escolhe **Itaú**, aplica regra extra: linhas **`PIX TRANSF`** (exceto rendimentos/devoluções) são classificadas como **despesa** — porque no extrato costumam ser envios. **PIX recebidos** com o mesmo texto podem ser marcados como receita no modal de revisão, ou marque a opção **“Não aplicar regra PIX Itaú”** antes de processar.

#### Período no arquivo

O intervalo de datas importado segue **`DTSTART` / `DTEND`** do OFX (o que o banco colocou no download). Não é limitação do app: para mais meses, exporte outro extrato no internet banking.

---

## 5. UI da Topbar (referência)

- Botão **“+ Novo”** (lançamento rápido) foi **removido** da Topbar; o componente `QuickAddModal` pode permanecer no repositório para reuso futuro.
- **Badge de trial:** exibido apenas quando restam **≤ 7 dias** de teste (evita ruído visual para planos longos).

---

*Última atualização: alinhado ao código em `main` (Liquid Glass, modais, importação).*
