'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { funcionarios, lancamentos } from '@/lib/db/schema'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { headers } from 'next/headers'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Nao autorizado')
  return session.user.id
}

// ─── Funcionários ───────────────────────────────────────────────────────────

export type FuncionarioInput = {
  id?: string
  nome: string
  funcao?: string
  telefone?: string
  salario?: number      // em centavos
  diaPagamento?: number
  ativo?: boolean
  observacoes?: string
}

export async function listarFuncionarios() {
  const userId = await getUserId()
  return db
    .select()
    .from(funcionarios)
    .where(eq(funcionarios.userId, userId))
    .orderBy(desc(funcionarios.ativo), funcionarios.nome)
}

export async function salvarFuncionario(dados: FuncionarioInput) {
  const userId = await getUserId()
  if (!dados.nome?.trim()) return { ok: false as const, mensagem: 'Informe o nome do funcionário.' }
  const agora = new Date()

  if (dados.id) {
    // Confere posse antes de atualizar
    const [existe] = await db
      .select({ id: funcionarios.id })
      .from(funcionarios)
      .where(and(eq(funcionarios.id, dados.id), eq(funcionarios.userId, userId)))
      .limit(1)
    if (!existe) return { ok: false as const, mensagem: 'Funcionário não encontrado.' }

    await db
      .update(funcionarios)
      .set({
        nome: dados.nome.trim(),
        funcao: dados.funcao ?? 'Ajudante',
        telefone: dados.telefone ?? '',
        salario: Math.max(0, Math.round(dados.salario ?? 0)),
        diaPagamento: Math.min(31, Math.max(0, dados.diaPagamento ?? 5)),
        ativo: dados.ativo ?? true,
        observacoes: dados.observacoes ?? '',
        updatedAt: agora,
      })
      .where(and(eq(funcionarios.id, dados.id), eq(funcionarios.userId, userId)))
    revalidatePath('/')
    return { ok: true as const, id: dados.id }
  }

  const id = randomUUID()
  await db.insert(funcionarios).values({
    id,
    userId,
    nome: dados.nome.trim(),
    funcao: dados.funcao ?? 'Ajudante',
    telefone: dados.telefone ?? '',
    salario: Math.max(0, Math.round(dados.salario ?? 0)),
    diaPagamento: Math.min(31, Math.max(0, dados.diaPagamento ?? 5)),
    ativo: dados.ativo ?? true,
    observacoes: dados.observacoes ?? '',
    createdAt: agora,
    updatedAt: agora,
  })
  revalidatePath('/')
  return { ok: true as const, id }
}

export async function excluirFuncionario(id: string) {
  const userId = await getUserId()
  await db.delete(funcionarios).where(and(eq(funcionarios.id, id), eq(funcionarios.userId, userId)))
  revalidatePath('/')
  return { ok: true as const }
}

// ─── Lançamentos (fluxo de caixa) ────────────────────────────────────────────

export type LancamentoInput = {
  id?: string
  tipo: 'receita' | 'despesa'
  categoria?: string
  descricao?: string
  valor: number         // em centavos, positivo
  data?: string         // ISO (yyyy-mm-dd); default = hoje
  funcionarioId?: string | null
  orcamentoId?: string | null
}

export async function salvarLancamento(dados: LancamentoInput) {
  const userId = await getUserId()
  const valor = Math.round(Math.abs(dados.valor ?? 0))
  if (valor <= 0) return { ok: false as const, mensagem: 'Informe um valor maior que zero.' }
  if (dados.tipo !== 'receita' && dados.tipo !== 'despesa') {
    return { ok: false as const, mensagem: 'Tipo inválido.' }
  }
  const data = dados.data ? new Date(dados.data + 'T12:00:00') : new Date()
  const agora = new Date()

  if (dados.id) {
    const [existe] = await db
      .select({ id: lancamentos.id })
      .from(lancamentos)
      .where(and(eq(lancamentos.id, dados.id), eq(lancamentos.userId, userId)))
      .limit(1)
    if (!existe) return { ok: false as const, mensagem: 'Lançamento não encontrado.' }
    await db
      .update(lancamentos)
      .set({
        tipo: dados.tipo,
        categoria: dados.categoria ?? 'outros',
        descricao: dados.descricao ?? '',
        valor,
        data,
        funcionarioId: dados.funcionarioId ?? null,
        orcamentoId: dados.orcamentoId ?? null,
      })
      .where(and(eq(lancamentos.id, dados.id), eq(lancamentos.userId, userId)))
    revalidatePath('/')
    return { ok: true as const, id: dados.id }
  }

  const id = randomUUID()
  await db.insert(lancamentos).values({
    id,
    userId,
    tipo: dados.tipo,
    categoria: dados.categoria ?? 'outros',
    descricao: dados.descricao ?? '',
    valor,
    data,
    funcionarioId: dados.funcionarioId ?? null,
    orcamentoId: dados.orcamentoId ?? null,
    createdAt: agora,
  })
  revalidatePath('/')
  return { ok: true as const, id }
}

export async function excluirLancamento(id: string) {
  const userId = await getUserId()
  await db.delete(lancamentos).where(and(eq(lancamentos.id, id), eq(lancamentos.userId, userId)))
  revalidatePath('/')
  return { ok: true as const }
}

// Registra o pagamento de salário de um funcionário como uma despesa
export async function pagarSalario(funcionarioId: string, valor?: number, data?: string) {
  const userId = await getUserId()
  const [f] = await db
    .select()
    .from(funcionarios)
    .where(and(eq(funcionarios.id, funcionarioId), eq(funcionarios.userId, userId)))
    .limit(1)
  if (!f) return { ok: false as const, mensagem: 'Funcionário não encontrado.' }
  const total = Math.round(valor ?? f.salario)
  if (total <= 0) return { ok: false as const, mensagem: 'Defina um salário para este funcionário antes de pagar.' }
  return salvarLancamento({
    tipo: 'despesa',
    categoria: 'salario',
    descricao: `Salário — ${f.nome}`,
    valor: total,
    data,
    funcionarioId,
  })
}

// ─── Consultas / resumo ───────────────────────────────────────────────────────

// Lista lançamentos de um mês (0-11) e ano específicos, mais recentes primeiro
export async function listarLancamentos(ano: number, mes: number) {
  const userId = await getUserId()
  const inicio = new Date(ano, mes, 1, 0, 0, 0)
  const fim = new Date(ano, mes + 1, 0, 23, 59, 59)
  return db
    .select()
    .from(lancamentos)
    .where(and(eq(lancamentos.userId, userId), gte(lancamentos.data, inicio), lte(lancamentos.data, fim)))
    .orderBy(desc(lancamentos.data), desc(lancamentos.createdAt))
}

export type ResumoFinanceiro = {
  receitas: number
  despesas: number
  saldo: number
  porCategoria: { categoria: string; tipo: string; total: number }[]
  porDia: { dia: number; receitas: number; despesas: number }[]
}

// Resumo consolidado de um mês: totais, quebra por categoria e série diária
export async function resumoMes(ano: number, mes: number): Promise<ResumoFinanceiro> {
  const linhas = await listarLancamentos(ano, mes)
  let receitas = 0
  let despesas = 0
  const catMap = new Map<string, { categoria: string; tipo: string; total: number }>()
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const porDia = Array.from({ length: diasNoMes }, (_, i) => ({ dia: i + 1, receitas: 0, despesas: 0 }))

  for (const l of linhas) {
    if (l.tipo === 'receita') receitas += l.valor
    else despesas += l.valor
    const chave = `${l.tipo}:${l.categoria}`
    const atual = catMap.get(chave) ?? { categoria: l.categoria, tipo: l.tipo, total: 0 }
    atual.total += l.valor
    catMap.set(chave, atual)
    const dia = new Date(l.data).getDate()
    const slot = porDia[dia - 1]
    if (slot) {
      if (l.tipo === 'receita') slot.receitas += l.valor
      else slot.despesas += l.valor
    }
  }

  return {
    receitas,
    despesas,
    saldo: receitas - despesas,
    porCategoria: Array.from(catMap.values()).sort((a, b) => b.total - a.total),
    porDia,
  }
}
