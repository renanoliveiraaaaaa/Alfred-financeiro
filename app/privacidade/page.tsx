import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacidade e Termos — Alfred Financeiro',
  description: 'Política de privacidade e termos de uso do Alfred Financeiro.',
}

export default function PrivacidadePage() {
  return (
    <div className="min-h-[100dvh] bg-background text-main">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/" className="text-sm text-muted hover:text-brand">
          ← Voltar
        </Link>

        <h1 className="mt-6 text-2xl font-semibold">Política de Privacidade e Termos de Uso</h1>
        <p className="mt-1 text-sm text-muted">Alfred Financeiro · última atualização: 21/05/2026</p>

        <section className="mt-8 space-y-4 text-sm leading-relaxed text-main">
          <h2 className="text-lg font-semibold">Política de Privacidade</h2>
          <ul className="list-disc space-y-2 pl-5 text-muted">
            <li>
              <strong className="text-main">Coleta:</strong> apenas dados necessários (nome, e-mail, dados
              financeiros inseridos por si).
            </li>
            <li>
              <strong className="text-main">Uso:</strong> exclusivamente para o serviço. Não vendemos nem
              partilhamos dados com terceiros.
            </li>
            <li>
              <strong className="text-main">Armazenamento:</strong> Supabase (PostgreSQL) com RLS ativo.
            </li>
            <li>
              <strong className="text-main">Acesso:</strong> só o titular acede aos seus dados financeiros.
            </li>
            <li>
              <strong className="text-main">Exclusão:</strong> pode solicitar remoção total da conta a qualquer
              momento.
            </li>
            <li>
              <strong className="text-main">Cookies:</strong> autenticação e preferências (tema, org, locale).
            </li>
          </ul>

          <h2 className="pt-4 text-lg font-semibold">Termos de Uso</h2>
          <ul className="list-disc space-y-2 pl-5 text-muted">
            <li>Ao criar conta, aceita estes termos.</li>
            <li>Uso pessoal ou empresarial legítimo; proibida automação maliciosa.</li>
            <li>O Alfred não se responsabiliza por decisões financeiras tomadas com base no sistema.</li>
            <li>O serviço pode passar por manutenções.</li>
            <li>Esta política pode ser atualizada; alterações relevantes serão comunicadas no app.</li>
          </ul>

          <h2 className="pt-4 text-lg font-semibold">Exclusão de conta</h2>
          <p className="text-muted">
            Solicite pelo canal de suporte ou nas definições do perfil (quando disponível). Após confirmação,
            os dados são removidos de forma irreversível em até 7 dias.
          </p>
        </section>

        <p className="mt-10 text-xs text-muted">
          Versão completa em{' '}
          <a
            href="https://github.com/renanoliveiraaaaaa/Alfred-financeiro/blob/main/docs/PRIVACIDADE_TERMO_DE_USO.md"
            className="underline hover:text-brand"
            target="_blank"
            rel="noopener noreferrer"
          >
            docs/PRIVACIDADE_TERMO_DE_USO.md
          </a>
        </p>
      </div>
    </div>
  )
}
