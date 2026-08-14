'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { aiUsage, licenses } from '@/lib/db/schema'
import { PLANOS, type PlanoId } from '@/lib/stripe'
import { and, eq, gte, sql } from 'drizzle-orm'
import { headers } from 'next/headers'

// ── Configuração do Admin ───────────────────────────────────────────────────
// Só estes e-mails enxergam o painel de custos/faturamento.
const ADMIN_EMAILS = ['lucasj0@hotmail.com']

// Preço do Gemini 2.5 Flash no AI Gateway (USD por 1 milhão de tokens).
// Ajuste aqui se o provedor mudar a tabela.
const PRECO_INPUT_USD_POR_MI = 0.30
const PRECO_OUTPUT_USD_POR_MI = 2.50
// Câmbio aproximado para exibir em reais (apenas estimativa visual).
const USD_PARA_BRL = 5.4

export async function ehAdmin(): Promise<boolean> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    const email = session?.user?.email?.toLowerCase()
    return !!email && ADMIN_EMAILS.includes(email)
  } catch {
    return false
  }
}

export interface AdminStats {
  // Gerações de IA
  geracoesHoje: number
  geracoesMes: number
  geracoesTotal: number
  // Tokens e custo (mês atual)
  inputTokensMes: number
  outputTokensMes: number
  custoMesUSD: number
  custoMesBRL: number
  // Assinaturas x receita
  assinantesBasico: number
  assinantesPro: number
  emTrial: number
  receitaMensalBRL: number
}

function inicioDoDia(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function inicioDoMes(): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function getAdminStats(): Promise<AdminStats | null> {
  if (!(await ehAdmin())) return null

  const hoje = inicioDoDia()
  const mes = inicioDoMes()

  // ── Gerações de IA ──────────────────────────────────────────────────────
  const [gHoje] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, hoje))

  const [gMes] = await db
    .select({
      n: sql<number>`count(*)::int`,
      inp: sql<number>`coalesce(sum(${aiUsage.inputTokens}),0)::int`,
      out: sql<number>`coalesce(sum(${aiUsage.outputTokens}),0)::int`,
    })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, mes))

  const [gTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(aiUsage)

  const inputTokensMes = gMes?.inp ?? 0
  const outputTokensMes = gMes?.out ?? 0
  const custoMesUSD =
    (inputTokensMes / 1_000_000) * PRECO_INPUT_USD_POR_MI +
    (outputTokensMes / 1_000_000) * PRECO_OUTPUT_USD_POR_MI

  // ── Assinaturas x receita ───────────────────────────────────────────────
  const [aBasico] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(licenses)
    .where(and(eq(licenses.status, 'active'), eq(licenses.plano, 'basico')))

  const [aPro] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(licenses)
    .where(and(eq(licenses.status, 'active'), eq(licenses.plano, 'pro')))

  const [trial] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(licenses)
    .where(eq(licenses.status, 'trial'))

  const assinantesBasico = aBasico?.n ?? 0
  const assinantesPro = aPro?.n ?? 0
  const emTrial = trial?.n ?? 0

  const receitaMensalBRL =
    (assinantesBasico * PLANOS.basico.precoCentavos +
      assinantesPro * PLANOS.pro.precoCentavos) /
    100

  return {
    geracoesHoje: gHoje?.n ?? 0,
    geracoesMes: gMes?.n ?? 0,
    geracoesTotal: gTotal?.n ?? 0,
    inputTokensMes,
    outputTokensMes,
    custoMesUSD,
    custoMesBRL: custoMesUSD * USD_PARA_BRL,
    assinantesBasico,
    assinantesPro,
    emTrial,
    receitaMensalBRL,
  }
}

// Helper de tipos exportado para o cliente
export type { PlanoId }
