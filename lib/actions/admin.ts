'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user, licenses, orcamentos } from '@/lib/db/schema'
import { PLANOS } from '@/lib/stripe'
import { eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'

// E-mail do dono/administrador com acesso ao painel.
const ADMIN_EMAIL = 'lucasj0@hotmail.com'

// true se o usuario logado for o administrador
export async function isAdmin(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.email?.toLowerCase() === ADMIN_EMAIL
}

export type UsuarioAdmin = {
  id: string
  nome: string
  email: string
  emailVerificado: boolean
  cadastradoEm: string // ISO
  licencaStatus: 'trial' | 'active' | 'expired' | 'sem-licenca'
  plano: string | null
  trialEndsAt: string | null
  ativadoEm: string | null
  totalOrcamentos: number
}

export type ResumoAdmin = {
  totalUsuarios: number
  emTeste: number
  ativos: number
  expirados: number
  totalOrcamentos: number
  receitaMensalCentavos: number
  novosUltimos7Dias: number
}

export type DadosAdmin = {
  resumo: ResumoAdmin
  usuarios: UsuarioAdmin[]
}

// Busca todos os usuarios + status de licenca + contagem de orcamentos.
// Protegido: so retorna se o solicitante for o administrador.
export async function getDadosAdmin(): Promise<DadosAdmin> {
  if (!(await isAdmin())) {
    throw new Error('Acesso restrito ao administrador.')
  }

  // 1) usuarios + licenca (left join)
  const rows = await db
    .select({
      id: user.id,
      nome: user.name,
      email: user.email,
      emailVerificado: user.emailVerified,
      cadastradoEm: user.createdAt,
      licencaStatus: licenses.status,
      plano: licenses.plano,
      trialEndsAt: licenses.trialEndsAt,
      ativadoEm: licenses.activatedAt,
    })
    .from(user)
    .leftJoin(licenses, eq(licenses.userId, user.id))
    .orderBy(sql`${user.createdAt} DESC`)

  // 2) contagem de orcamentos por usuario
  const counts = await db
    .select({
      userId: orcamentos.userId,
      total: sql<number>`count(*)::int`,
    })
    .from(orcamentos)
    .groupBy(orcamentos.userId)

  const mapaContagem = new Map<string, number>()
  for (const c of counts) mapaContagem.set(c.userId, c.total)

  const agora = new Date()

  const usuarios: UsuarioAdmin[] = rows.map((r) => {
    // Normaliza o status: trial cujo prazo passou vira "expired" na visualizacao
    let status: UsuarioAdmin['licencaStatus'] = 'sem-licenca'
    if (r.licencaStatus === 'active') status = 'active'
    else if (r.licencaStatus === 'trial') {
      status = r.trialEndsAt && new Date(r.trialEndsAt) < agora ? 'expired' : 'trial'
    } else if (r.licencaStatus === 'expired') status = 'expired'

    return {
      id: r.id,
      nome: r.nome,
      email: r.email,
      emailVerificado: r.emailVerificado,
      cadastradoEm: r.cadastradoEm.toISOString(),
      licencaStatus: status,
      plano: r.plano ?? null,
      trialEndsAt: r.trialEndsAt ? new Date(r.trialEndsAt).toISOString() : null,
      ativadoEm: r.ativadoEm ? new Date(r.ativadoEm).toISOString() : null,
      totalOrcamentos: mapaContagem.get(r.id) ?? 0,
    }
  })

  // 3) resumo/estatisticas
  const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
  let receitaMensalCentavos = 0
  for (const u of usuarios) {
    if (u.licencaStatus === 'active') {
      const p = (u.plano === 'pro' ? PLANOS.pro : PLANOS.basico)
      receitaMensalCentavos += p.precoCentavos
    }
  }

  const resumo: ResumoAdmin = {
    totalUsuarios: usuarios.length,
    emTeste: usuarios.filter((u) => u.licencaStatus === 'trial').length,
    ativos: usuarios.filter((u) => u.licencaStatus === 'active').length,
    expirados: usuarios.filter((u) => u.licencaStatus === 'expired').length,
    totalOrcamentos: usuarios.reduce((s, u) => s + u.totalOrcamentos, 0),
    receitaMensalCentavos,
    novosUltimos7Dias: usuarios.filter((u) => new Date(u.cadastradoEm) >= seteDiasAtras).length,
  }

  return { resumo, usuarios }
}
