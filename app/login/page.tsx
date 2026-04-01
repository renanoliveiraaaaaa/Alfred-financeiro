import { redirect } from 'next/navigation'

/** Rota dedicada para redirecionamentos de auth; o formulário de login permanece na raiz `/`. */
export default function LoginRedirectPage() {
  redirect('/')
}
