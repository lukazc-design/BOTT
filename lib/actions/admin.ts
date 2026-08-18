'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { aiUsage, licenses, user, session, userActivity } from '@/lib/db/schema'
import { PLANOS, type PlanoId } from '@/lib/stripe'
import { eq, gte, sql } from 'drizzle-orm'
import { headers } from 'next/headers'

// ── Configuração do Admin ───────────────────────────────────────────────────
// Estes e-mails são SEMPRE admin (bootstrap). Outros podem ser promovidos no painel.
const ADMIN_EMAILS = ['lucasj0@hotmail.com']

// Preço do Gemini 2.5 Flash no AI Gateway (USD por 1 milhão de tokens).
const PRECO_INPUT_USD_POR_MI = 0.30
const PRECO_OUTPUT_USD_POR_MI = 2.50
const USD_PARA_BRL = 5.4

async function getSessionUser() {
  const s = await auth.api.getSession({ headers: await headers() })
  return s?.user ?? null
}

// É admin se o e-mail está na lista fixa OU se foi promovido (flag no banco).
export async function ehAdmin(): Promise<boolean> {
  try {
    const u = await getSessionUser()
    if (!u) return false
    const email = u.email?.toLowerCase()
    if (email && ADMIN_EMAILS.includes(email)) return true
    const [row] = await db
      .select({ isAdmin: userActivity.isAdmin })
      .from(userActivity)
      .where(eq(userActivity.userId, u.id))
      .limit(1)
    return row?.isAdmin === true
  } catch {
    return false
  }
}

// Garante que só admins executem uma ação; devolve o id do admin logado.
async function exigirAdmin(): Promise<string> {
  const u = await getSessionUser()
  if (!u) throw new Error('Não autorizado')
  const email = u.email?.toLowerCase()
  const bootstrap = !!email && ADMIN_EMAILS.includes(email)
  if (!bootstrap) {
    const [row] = await db
      .select({ isAdmin: userActivity.isAdmin })
      .from(userActivity)
      .where(eq(userActivity.userId, u.id))
      .limit(1)
    if (row?.isAdmin !== true) throw new Error('Não autorizado')
  }
  return u.id
}

// ── Registro de atividade (chamado pelo cliente) ────────────────────────────

// Garante a linha de atividade do usuário logado (cria se não existir).
async function garantirLinha(userId: string) {
  await db
    .insert(userActivity)
    .values({ userId, acessos: 0, tempoTotalSegundos: 0, createdAt: new Date() })
    .onConflictDoNothing()
}

// Registra 1 acesso (abertura do sistema) — chamado uma vez por carregamento.
export async function registrarAcesso(): Promise<void> {
  try {
    const u = await getSessionUser()
    if (!u) return
    await garantirLinha(u.id)
    await db
      .update(userActivity)
      .set({ acessos: sql`${userActivity.acessos} + 1`, ultimoAcesso: new Date() })
      .where(eq(userActivity.userId, u.id))
  } catch {
    // best-effort
  }
}

// Soma tempo de uso (heartbeat) — chamado periodicamente enquanto o app está aberto.
export async function pingAtividade(segundos: number): Promise<void> {
  try {
    const u = await getSessionUser()
    if (!u) return
    const seg = Math.max(0, Math.min(600, Math.floor(segundos || 0)))
    await garantirLinha(u.id)
    await db
      .update(userActivity)
      .set({
        tempoTotalSegundos: sql`${userActivity.tempoTotalSegundos} + ${seg}`,
        ultimoAcesso: new Date(),
      })
      .where(eq(userActivity.userId, u.id))
  } catch {
    // best-effort
  }
}

// ── Listagem de usuários (painel de administração de acessos) ───────────────

export interface UsuarioAdmin {
  userId: string
  nome: string
  email: string
  acessoLiberado: boolean
  isAdmin: boolean
  temAcesso: boolean          // acesso efetivo (liberado, assinante ou trial válido)
  origemAcesso: 'admin' | 'liberado' | 'assinante' | 'trial' | 'expirado'
  acessos: number
  tempoTotalSegundos: number
  ultimoAcesso: string | null // ISO
}

export interface PainelAdmin {
  usuarios: UsuarioAdmin[]
  totalUsuarios: number
  comAcesso: number
  admins: number
  acessosTotais: number
}

export async function listarUsuarios(): Promise<PainelAdmin | null> {
  if (!(await ehAdmin())) return null

  // Usuários + flags + licença + agregados de sessão (nº de acessos e último acesso)
  const usuarios = await db.select().from(user)
  const atividades = await db.select().from(userActivity)
  const licencas = await db.select().from(licenses)
  const sessoes = await db
    .select({
      userId: session.userId,
      n: sql<number>`count(*)::int`,
      ult: sql<string>`max(${session.createdAt})`,
    })
    .from(session)
    .groupBy(session.userId)

  const mapAtiv = new Map(atividades.map(a => [a.userId, a]))
  const mapLic = new Map(licencas.map(l => [l.userId, l]))
  const mapSess = new Map(sessoes.map(s => [s.userId, s]))
  const agora = Date.now()

  const lista: UsuarioAdmin[] = usuarios.map(u => {
    const ativ = mapAtiv.get(u.id)
    const lic = mapLic.get(u.id)
    const sess = mapSess.get(u.id)

    const emailAdmin = ADMIN_EMAILS.includes(u.email.toLowerCase())
    const isAdmin = emailAdmin || ativ?.isAdmin === true
    const acessoLiberado = ativ?.acessoLiberado === true

    // Acesso efetivo
    let origem: UsuarioAdmin['origemAcesso'] = 'expirado'
    if (isAdmin) origem = 'admin'
    else if (acessoLiberado) origem = 'liberado'
    else if (lic?.status === 'active') origem = 'assinante'
    else if (lic?.status === 'trial' && new Date(lic.trialEndsAt).getTime() > agora) origem = 'trial'
    const temAcesso = origem !== 'expirado'

    // Nº de acessos: prefere o maior entre o contador manual e a contagem de sessões
    const acessos = Math.max(ativ?.acessos ?? 0, sess?.n ?? 0)

    // Último acesso: o mais recente entre atividade e sessão
    const ultAtiv = ativ?.ultimoAcesso ? new Date(ativ.ultimoAcesso).getTime() : 0
    const ultSess = sess?.ult ? new Date(sess.ult).getTime() : 0
    const ultMs = Math.max(ultAtiv, ultSess)

    return {
      userId: u.id,
      nome: u.name,
      email: u.email,
      acessoLiberado,
      isAdmin,
      temAcesso,
      origemAcesso: origem,
      acessos,
      tempoTotalSegundos: ativ?.tempoTotalSegundos ?? 0,
      ultimoAcesso: ultMs > 0 ? new Date(ultMs).toISOString() : null,
    }
  })

  // Ordena por último acesso desc
  lista.sort((a, b) => (b.ultimoAcesso ?? '').localeCompare(a.ultimoAcesso ?? ''))

  return {
    usuarios: lista,
    totalUsuarios: lista.length,
    comAcesso: lista.filter(u => u.temAcesso).length,
    admins: lista.filter(u => u.isAdmin).length,
    acessosTotais: lista.reduce((s, u) => s + u.acessos, 0),
  }
}

// Libera ou bloqueia o acesso manual de um usuário.
export async function alternarAcesso(userId: string, liberar: boolean): Promise<{ ok: boolean }> {
  try {
    await exigirAdmin()
    await garantirLinha(userId)
    await db
      .update(userActivity)
      .set({ acessoLiberado: liberar })
      .where(eq(userActivity.userId, userId))
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

// Promove ou remove um usuário como administrador.
export async function alternarAdmin(userId: string, tornarAdmin: boolean): Promise<{ ok: boolean }> {
  try {
    const adminId = await exigirAdmin()
    // Impede o admin de remover a si mesmo (evita ficar sem nenhum admin por engano)
    if (adminId === userId && !tornarAdmin) return { ok: false }
    await garantirLinha(userId)
    await db
      .update(userActivity)
      .set({ isAdmin: tornarAdmin })
      .where(eq(userActivity.userId, userId))
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

// ── Estatísticas financeiras (mantidas) ─────────────────────────────────────

export interface AdminStats {
  geracoesHoje: number
  geracoesMes: number
  geracoesTotal: number
  inputTokensMes: number
  outputTokensMes: number
  custoMesUSD: number
  custoMesBRL: number
  assinantesAtivos: number
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

  const [ativos] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(licenses)
    .where(eq(licenses.status, 'active'))

  const [trial] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(licenses)
    .where(eq(licenses.status, 'trial'))

  const assinantesAtivos = ativos?.n ?? 0
  const emTrial = trial?.n ?? 0

  const receitaMensalBRL = (assinantesAtivos * PLANOS.mensal.precoCentavos) / 100

  return {
    geracoesHoje: gHoje?.n ?? 0,
    geracoesMes: gMes?.n ?? 0,
    geracoesTotal: gTotal?.n ?? 0,
    inputTokensMes,
    outputTokensMes,
    custoMesUSD,
    custoMesBRL: custoMesUSD * USD_PARA_BRL,
    assinantesAtivos,
    emTrial,
    receitaMensalBRL,
  }
}

export type { PlanoId }
