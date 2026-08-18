'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { licenses, orcamentos, userActivity, user } from '@/lib/db/schema'
import { stripe, PLANOS, TRIAL_DIAS, limiteOrcamentos, type PlanoId } from '@/lib/stripe'
import { and, eq, gte, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { randomUUID } from 'crypto'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Nao autorizado')
  return session.user.id
}

// Retorna a licenca do usuario autenticado (cria trial se nao existir)
export async function getLicenca() {
  const userId = await getUserId()

  const [existing] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.userId, userId))
    .limit(1)

  if (existing) return existing

  // Primeiro acesso — cria trial automaticamente
  const now = new Date()
  const trialEnds = new Date(now.getTime() + TRIAL_DIAS * 24 * 60 * 60 * 1000)
  const nova = {
    id: randomUUID(),
    userId,
    status: 'trial',
    plano: null,
    trialStartedAt: now,
    trialEndsAt: trialEnds,
    activatedAt: null,
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    createdAt: now,
  }
  await db.insert(licenses).values(nova)
  return nova
}

// Conta quantos orcamentos o usuario salvou no MES atual (fonte de verdade p/ o limite)
export async function getUsoMensal(): Promise<number> {
  const userId = await getUserId()
  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)

  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orcamentos)
    .where(and(eq(orcamentos.userId, userId), gte(orcamentos.createdAt, inicioMes)))

  return row?.n ?? 0
}

// Verifica se o usuario tem acesso (trial valido ou licenca ativa) + uso/limite do mes
export async function verificarAcesso(): Promise<{
  permitido: boolean
  status: 'trial' | 'active' | 'expired'
  plano?: PlanoId | null
  diasRestantes?: number
  limiteMes: number
  usoMes: number
}> {
  try {
    const licenca = await getLicenca()
    const agora = new Date()
    const usoMes = await getUsoMensal()

    // Override do admin: acesso manual liberado ou usuário administrador → acesso ilimitado.
    const userId = await getUserId()
    const [ativ] = await db
      .select({ acessoLiberado: userActivity.acessoLiberado, isAdmin: userActivity.isAdmin })
      .from(userActivity)
      .where(eq(userActivity.userId, userId))
      .limit(1)
    const [u] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1)
    const emailAdmin = u?.email?.toLowerCase() === 'lucasj0@hotmail.com'
    if (emailAdmin || ativ?.isAdmin || ativ?.acessoLiberado) {
      return {
        permitido: true,
        status: 'active',
        plano: 'mensal',
        limiteMes: 999999,
        usoMes,
      }
    }

    if (licenca.status === 'active') {
      return {
        permitido: true, status: 'active', plano: 'mensal',
        limiteMes: limiteOrcamentos('active'), usoMes,
      }
    }

    if (licenca.status === 'trial') {
      const fim = new Date(licenca.trialEndsAt)
      if (agora < fim) {
        const ms = fim.getTime() - agora.getTime()
        const dias = Math.ceil(ms / (1000 * 60 * 60 * 24))
        return {
          permitido: true, status: 'trial', diasRestantes: dias,
          limiteMes: limiteOrcamentos('trial', null), usoMes,
        }
      }
      return { permitido: false, status: 'expired', limiteMes: 0, usoMes }
    }

    return { permitido: false, status: 'expired', limiteMes: 0, usoMes }
  } catch {
    return { permitido: false, status: 'expired', limiteMes: 0, usoMes: 0 }
  }
}

// Cria sessao de checkout Stripe para o plano escolhido (basico | pro)
export async function criarCheckoutLicenca(planoId: PlanoId = 'mensal'): Promise<{ url: string }> {
  const userId = await getUserId()
  const session = await auth.api.getSession({ headers: await headers() })
  const email = session?.user?.email ?? undefined
  const plano = PLANOS[planoId] ?? PLANOS.mensal

  const origin =
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL ?? 'http://localhost:3000'

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    ui_mode: 'hosted_page',
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: { name: plano.nome },
          unit_amount: plano.precoCentavos,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: { userId, plano: plano.id },
    },
    metadata: { userId, plano: plano.id },
    success_url: `${origin}/?licenca=sucesso&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?licenca=cancelado`,
  })

  return { url: checkout.url! }
}

// Confirma o pagamento no RETORNO do checkout (dispensa webhook para ativar).
// Consulta a sessao no Stripe, valida que foi paga e pertence a este usuario,
// e ativa a licenca com o plano correto.
export async function confirmarCheckout(sessionId: string): Promise<{ ok: boolean; mensagem?: string }> {
  if (!sessionId) return { ok: false, mensagem: 'Sessão inválida.' }
  let userId: string
  try {
    userId = await getUserId()
  } catch {
    return { ok: false, mensagem: 'Não autorizado.' }
  }

  try {
    const sess = await stripe.checkout.sessions.retrieve(sessionId)

    // Só ativa se realmente foi pago e a sessão é DESTE usuário
    const pago = sess.payment_status === 'paid' || sess.status === 'complete'
    const donoOk = sess.metadata?.userId === userId
    if (!pago || !donoOk) {
      return { ok: false, mensagem: 'Pagamento ainda não confirmado.' }
    }

    const plano = 'mensal'
    const subId = typeof sess.subscription === 'string' ? sess.subscription : null
    const custId = typeof sess.customer === 'string' ? sess.customer : null

    await db
      .update(licenses)
      .set({
        status: 'active',
        plano,
        activatedAt: new Date(),
        stripeSubscriptionId: subId,
        stripeCustomerId: custId,
      })
      .where(eq(licenses.userId, userId))

    return { ok: true }
  } catch {
    return { ok: false, mensagem: 'Não foi possível confirmar o pagamento.' }
  }
}
