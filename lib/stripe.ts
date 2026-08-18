import 'server-only'
import Stripe from 'stripe'

// Resolve a chave secreta a ser usada. A chave LIVE do usuário pode ter sido
// salva em variáveis diferentes (STRIPE_SECRET_KEY, STRIPE_ACCESS_TOKEN, etc.).
// Preferimos SEMPRE uma chave de produção (sk_live_) sobre uma de teste.
function resolverChaveSecreta(): string {
  const candidatos = [
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_ACCESS_TOKEN_2,
    process.env.STRIPE_ACCESS_TOKEN,
  ].filter(Boolean) as string[]

  // 1ª preferência: chave secreta de produção padrão
  const skLive = candidatos.find(k => k.startsWith('sk_live_'))
  if (skLive) return skLive
  // 2ª: chave restrita de produção
  const rkLive = candidatos.find(k => k.startsWith('rk_live_'))
  if (rkLive) return rkLive
  // fallback: o que estiver em STRIPE_SECRET_KEY (provavelmente teste)
  return process.env.STRIPE_SECRET_KEY ?? candidatos[0] ?? ''
}

const chaveSecreta = resolverChaveSecreta()
export const stripeModo: 'live' | 'test' | 'desconhecido' =
  chaveSecreta.startsWith('sk_live_') || chaveSecreta.startsWith('rk_live_') ? 'live'
  : chaveSecreta.startsWith('sk_test_') || chaveSecreta.startsWith('rk_test_') ? 'test'
  : 'desconhecido'

export const stripe = new Stripe(chaveSecreta, {
  typescript: true,
})

// ── Teste gratis: 7 dias para experimentar tudo ──
export const TRIAL_DIAS = 7
export const TRIAL_MAX_ORCAMENTOS = 15

// ── Plano unico mensal ──
export type PlanoId = 'mensal'

// Valor de exibicao formatado (usado em textos da UI)
export const PRECO_MENSAL_LABEL = 'R$ 9,99'

export const PLANOS: Record<PlanoId, {
  id: PlanoId
  nome: string
  precoCentavos: number
  maxOrcamentos: number   // limite de orcamentos salvos por mes
}> = {
  mensal: { id: 'mensal', nome: 'OrçaFacil-Frio — Mensal', precoCentavos: 999, maxOrcamentos: 100 },
}

// Limite de orcamentos por mes conforme status/plano
export function limiteOrcamentos(status: string, _plano?: string | null): number {
  if (status === 'active') return PLANOS.mensal.maxOrcamentos
  if (status === 'trial') return TRIAL_MAX_ORCAMENTOS
  return 0 // expirado
}
