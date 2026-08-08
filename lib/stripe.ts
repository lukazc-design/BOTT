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

// ── Teste gratis: 1 dia, com poucos orcamentos so pra experimentar ──
export const TRIAL_DIAS = 1
export const TRIAL_MAX_ORCAMENTOS = 5

// ── Planos mensais ──
export type PlanoId = 'basico' | 'pro'

export const PLANOS: Record<PlanoId, {
  id: PlanoId
  nome: string
  precoCentavos: number
  maxOrcamentos: number   // limite de orcamentos salvos por mes
}> = {
  basico: { id: 'basico', nome: 'OrçaFacil Frio — Básico', precoCentavos: 1500, maxOrcamentos: 30 },
  pro:    { id: 'pro',    nome: 'OrçaFacil Frio — Pro',    precoCentavos: 3000, maxOrcamentos: 100 },
}

// Limite de orcamentos por mes conforme status/plano
export function limiteOrcamentos(status: string, plano: string | null | undefined): number {
  if (status === 'active') {
    if (plano === 'pro') return PLANOS.pro.maxOrcamentos
    return PLANOS.basico.maxOrcamentos // default basico
  }
  if (status === 'trial') return TRIAL_MAX_ORCAMENTOS
  return 0 // expirado
}
