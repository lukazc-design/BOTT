'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { clientes, aparelhos, orcamentos, lancamentos } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Nao autorizado')
  return session.user.id
}

// Soma meses a uma data (para calcular a próxima manutenção)
function addMeses(base: Date, meses: number): Date {
  const d = new Date(base)
  d.setMonth(d.getMonth() + meses)
  return d
}

export type ClienteInput = {
  id?: string
  nome: string
  telefone?: string
  telefone2?: string
  email?: string
  endereco?: string
  bairro?: string
  cidade?: string
  observacoes?: string
}

export type AparelhoInput = {
  id?: string
  clienteId: string
  tipo?: string
  marca?: string
  modelo?: string
  btu?: number
  tensao?: string
  gas?: string
  ambiente?: string
  dataInstalacao?: string | null  // '' ou null = sem data
  intervaloLimpezaMeses?: number
  ultimaLimpeza?: string | null    // '' ou null = sem data
  observacoes?: string
}

// ─── CLIENTES ───────────────────────────────────────────────────────────────

// Lista clientes com um resumo (nº de aparelhos e de orçamentos) para a lista.
export async function listarClientes() {
  const userId = await getUserId()
  const lista = await db
    .select()
    .from(clientes)
    .where(eq(clientes.userId, userId))
    .orderBy(desc(clientes.updatedAt))

  // Contagens por cliente (aparelhos e orçamentos)
  const aps = await db.select({ clienteId: aparelhos.clienteId }).from(aparelhos).where(eq(aparelhos.userId, userId))
  const orcs = await db.select({ clienteId: orcamentos.clienteId }).from(orcamentos).where(eq(orcamentos.userId, userId))

  const contaAp = new Map<string, number>()
  aps.forEach(a => contaAp.set(a.clienteId, (contaAp.get(a.clienteId) ?? 0) + 1))
  const contaOrc = new Map<string, number>()
  orcs.forEach(o => { if (o.clienteId) contaOrc.set(o.clienteId, (contaOrc.get(o.clienteId) ?? 0) + 1) })

  return lista.map(c => ({
    ...c,
    qtdAparelhos: contaAp.get(c.id) ?? 0,
    qtdOrcamentos: contaOrc.get(c.id) ?? 0,
  }))
}

// Ficha completa: dados do cliente + aparelhos + orçamentos vinculados
export async function obterCliente(id: string) {
  const userId = await getUserId()
  const [cliente] = await db
    .select().from(clientes)
    .where(and(eq(clientes.id, id), eq(clientes.userId, userId)))
    .limit(1)
  if (!cliente) return null

  const listaAparelhos = await db
    .select().from(aparelhos)
    .where(and(eq(aparelhos.clienteId, id), eq(aparelhos.userId, userId)))
    .orderBy(desc(aparelhos.createdAt))

  const listaOrcamentosRaw = await db
    .select({
      id: orcamentos.id,
      status: orcamentos.status,
      totalVenda: orcamentos.totalVenda,
      createdAt: orcamentos.createdAt,
    }).from(orcamentos)
    .where(and(eq(orcamentos.clienteId, id), eq(orcamentos.userId, userId)))
    .orderBy(desc(orcamentos.createdAt))

  // Um orçamento é "recebido" se já existe um lançamento de receita vinculado a ele
  const receitasVinculadas = await db
    .select({ orcamentoId: lancamentos.orcamentoId })
    .from(lancamentos)
    .where(and(eq(lancamentos.userId, userId), eq(lancamentos.tipo, 'receita')))
  const idsRecebidos = new Set(receitasVinculadas.map(r => r.orcamentoId).filter(Boolean))
  const listaOrcamentos = listaOrcamentosRaw.map(o => ({ ...o, recebido: idsRecebidos.has(o.id) }))

  return { cliente, aparelhos: listaAparelhos, orcamentos: listaOrcamentos }
}

export async function salvarCliente(dados: ClienteInput) {
  const userId = await getUserId()
  const nome = dados.nome?.trim()
  if (!nome) return { ok: false as const, mensagem: 'Informe o nome do cliente.' }

  const now = new Date()
  const id = dados.id ?? randomUUID()
  const values = {
    id,
    userId,
    nome,
    telefone: dados.telefone ?? '',
    telefone2: dados.telefone2 ?? '',
    email: dados.email ?? '',
    endereco: dados.endereco ?? '',
    bairro: dados.bairro ?? '',
    cidade: dados.cidade ?? '',
    observacoes: dados.observacoes ?? '',
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(clientes).values(values).onConflictDoUpdate({
    target: clientes.id,
    set: {
      nome: values.nome,
      telefone: values.telefone,
      telefone2: values.telefone2,
      email: values.email,
      endereco: values.endereco,
      bairro: values.bairro,
      cidade: values.cidade,
      observacoes: values.observacoes,
      updatedAt: now,
    },
  })

  revalidatePath('/')
  return { ok: true as const, id }
}

export async function excluirCliente(id: string) {
  const userId = await getUserId()
  // Remove aparelhos do cliente e desvincula orçamentos (mantém histórico do orçamento)
  await db.delete(aparelhos).where(and(eq(aparelhos.clienteId, id), eq(aparelhos.userId, userId)))
  await db.update(orcamentos).set({ clienteId: null }).where(and(eq(orcamentos.clienteId, id), eq(orcamentos.userId, userId)))
  await db.delete(clientes).where(and(eq(clientes.id, id), eq(clientes.userId, userId)))
  revalidatePath('/')
  return { ok: true as const }
}

// ─── APARELHOS ──────────────────────────────────────────────────────────────

export async function salvarAparelho(dados: AparelhoInput) {
  const userId = await getUserId()
  if (!dados.clienteId) return { ok: false as const, mensagem: 'Cliente inválido.' }

  const now = new Date()
  const id = dados.id ?? randomUUID()
  const intervalo = dados.intervaloLimpezaMeses ?? 6
  const ultima = dados.ultimaLimpeza ? new Date(dados.ultimaLimpeza) : null
  // Próxima manutenção = última limpeza (ou instalação, ou hoje) + intervalo
  const baseCalc = ultima ?? (dados.dataInstalacao ? new Date(dados.dataInstalacao) : now)
  const proxima = addMeses(baseCalc, intervalo)

  const values = {
    id,
    userId,
    clienteId: dados.clienteId,
    tipo: dados.tipo ?? 'Split',
    marca: dados.marca ?? '',
    modelo: dados.modelo ?? '',
    btu: dados.btu ?? 0,
    tensao: dados.tensao ?? '',
    gas: dados.gas ?? '',
    ambiente: dados.ambiente ?? '',
    dataInstalacao: dados.dataInstalacao ? new Date(dados.dataInstalacao) : null,
    intervaloLimpezaMeses: intervalo,
    ultimaLimpeza: ultima,
    proximaManutencao: proxima,
    observacoes: dados.observacoes ?? '',
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(aparelhos).values(values).onConflictDoUpdate({
    target: aparelhos.id,
    set: {
      tipo: values.tipo,
      marca: values.marca,
      modelo: values.modelo,
      btu: values.btu,
      tensao: values.tensao,
      gas: values.gas,
      ambiente: values.ambiente,
      dataInstalacao: values.dataInstalacao,
      intervaloLimpezaMeses: values.intervaloLimpezaMeses,
      ultimaLimpeza: values.ultimaLimpeza,
      proximaManutencao: values.proximaManutencao,
      observacoes: values.observacoes,
      updatedAt: now,
    },
  })

  revalidatePath('/')
  return { ok: true as const, id }
}

export async function excluirAparelho(id: string) {
  const userId = await getUserId()
  await db.delete(aparelhos).where(and(eq(aparelhos.id, id), eq(aparelhos.userId, userId)))
  revalidatePath('/')
  return { ok: true as const }
}
