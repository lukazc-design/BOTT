'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { orcamentos } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import type { EquipamentoOrcamento, ItemOrcamento } from '@/lib/tipos'
import { verificarAcesso } from '@/lib/actions/licenca'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Nao autorizado')
  return session.user.id
}

export async function listarOrcamentos() {
  const userId = await getUserId()
  return db
    .select()
    .from(orcamentos)
    .where(eq(orcamentos.userId, userId))
    .orderBy(desc(orcamentos.updatedAt))
}

export async function salvarOrcamento(dados: {
  id?: string
  clienteNome: string
  clienteEndereco: string
  clienteTelefone: string
  observacoes: string
  equipamentos: EquipamentoOrcamento[]
  itens: ItemOrcamento[]
  totalCusto: number
  totalVenda: number
}) {
  const userId = await getUserId()
  const now = new Date()
  const id = dados.id ?? randomUUID()

  // É um orçamento NOVO? (só conta para o limite ao criar, não ao editar)
  const [jaExiste] = await db
    .select({ id: orcamentos.id })
    .from(orcamentos)
    .where(and(eq(orcamentos.id, id), eq(orcamentos.userId, userId)))
    .limit(1)

  // Verifica acesso e limite mensal (bloqueio real conforme o plano/trial)
  const acesso = await verificarAcesso()
  if (!acesso.permitido) {
    return { ok: false as const, mensagem: 'Seu acesso expirou. Assine um plano para continuar salvando orçamentos.' }
  }
  if (!jaExiste && acesso.usoMes >= acesso.limiteMes) {
    const sufixo = acesso.status === 'trial'
      ? 'Assine um plano para salvar mais.'
      : 'Você atingiu o limite do seu plano este mês. Faça upgrade para salvar mais.'
    return { ok: false as const, mensagem: `Limite de ${acesso.limiteMes} orçamentos/mês atingido. ${sufixo}` }
  }

  await db
    .insert(orcamentos)
    .values({
      id,
      userId,
      clienteNome: dados.clienteNome,
      clienteEndereco: dados.clienteEndereco,
      clienteTelefone: dados.clienteTelefone,
      observacoes: dados.observacoes,
      equipamentosJson: JSON.stringify(dados.equipamentos),
      itensJson: JSON.stringify(dados.itens),
      totalCusto: Math.round(dados.totalCusto * 100),
      totalVenda: Math.round(dados.totalVenda * 100),
      status: 'rascunho',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: orcamentos.id,
      set: {
        clienteNome: dados.clienteNome,
        clienteEndereco: dados.clienteEndereco,
        clienteTelefone: dados.clienteTelefone,
        observacoes: dados.observacoes,
        equipamentosJson: JSON.stringify(dados.equipamentos),
        itensJson: JSON.stringify(dados.itens),
        totalCusto: Math.round(dados.totalCusto * 100),
        totalVenda: Math.round(dados.totalVenda * 100),
        updatedAt: now,
      },
    })

  revalidatePath('/')
  return { ok: true as const, id }
}

export async function deletarOrcamento(id: string) {
  const userId = await getUserId()
  await db
    .delete(orcamentos)
    .where(and(eq(orcamentos.id, id), eq(orcamentos.userId, userId)))
  revalidatePath('/')
}
