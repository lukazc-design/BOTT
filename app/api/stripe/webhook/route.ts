import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { licenses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'

  let event: ReturnType<typeof stripe.webhooks.constructEvent> extends Promise<infer T> ? T : ReturnType<typeof stripe.webhooks.constructEvent>

  // SEGURANÇA: em producao a assinatura é OBRIGATÓRIA. Sem ela, qualquer um
  // poderia forjar um evento e ativar licenca de graca. Só aceitamos o
  // fallback sem assinatura fora de producao (sandbox/dev).
  if (webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch {
      return NextResponse.json({ error: 'Assinatura do webhook inválida' }, { status: 400 })
    }
  } else if (!isProd) {
    try {
      event = JSON.parse(body)
    } catch {
      return NextResponse.json({ error: 'Corpo do webhook inválido' }, { status: 400 })
    }
  } else {
    // Produção sem segredo/assinatura configurada → recusa
    return NextResponse.json(
      { error: 'Webhook não configurado: defina STRIPE_WEBHOOK_SECRET em produção.' },
      { status: 400 },
    )
  }

  // Assinatura criada ou renovada — ativa licenca
  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const sub = event.data.object as {
      id: string
      status: string
      metadata?: { userId?: string; plano?: string }
      customer?: string
    }
    const userId = sub.metadata?.userId
    const plano = sub.metadata?.plano === 'pro' ? 'pro' : 'basico'
    const isAtiva = sub.status === 'active' || sub.status === 'trialing'

    if (userId && isAtiva) {
      const now = new Date()
      await db
        .update(licenses)
        .set({
          status: 'active',
          plano,
          activatedAt: now,
          stripeSubscriptionId: sub.id,
          stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : null,
        })
        .where(eq(licenses.userId, userId))
    }
  }

  // Assinatura cancelada ou expirada — desativa licenca
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as { id: string }
    await db
      .update(licenses)
      .set({ status: 'expired' })
      .where(eq(licenses.stripeSubscriptionId, sub.id))
  }

  // Checkout concluido — garante que o userId da sessao ative a licenca
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      metadata?: { userId?: string; plano?: string }
      customer?: string
      subscription?: string
    }
    const userId = session.metadata?.userId
    const plano = session.metadata?.plano === 'pro' ? 'pro' : 'basico'
    if (userId && session.subscription) {
      const now = new Date()
      await db
        .update(licenses)
        .set({
          status: 'active',
          plano,
          activatedAt: now,
          stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
        })
        .where(eq(licenses.userId, userId))
    }
  }

  return NextResponse.json({ received: true })
}
