'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { orcamentos, clientes } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { apenasDigitos } from '@/lib/telefone'
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

// Resolve o cliente vinculado ao orçamento:
// 1) usa clienteId se veio explícito; 2) senão tenta casar pelo telefone;
// 3) senão cria um cliente novo com os dados digitados no orçamento.
async function resolverClienteId(
  userId: string,
  clienteIdEntrada: string | undefined,
  nome: string,
  telefone: string,
  endereco: string,
): Promise<string | null> {
  if (clienteIdEntrada) {
    const [c] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(and(eq(clientes.id, clienteIdEntrada), eq(clientes.userId, userId)))
      .limit(1)
    if (c) return c.id
  }
  const nomeLimpo = nome.trim()
  if (!nomeLimpo) return null

  // Casa por telefone (dedupe) quando houver
  const telDigitos = apenasDigitos(telefone)
  if (telDigitos) {
    const existentes = await db
      .select({ id: clientes.id, telefone: clientes.telefone })
      .from(clientes)
      .where(eq(clientes.userId, userId))
    const match = existentes.find(c => apenasDigitos(c.telefone) === telDigitos)
    if (match) return match.id
  }

  // Cria cliente novo a partir do orçamento
  const now = new Date()
  const novoId = randomUUID()
  await db.insert(clientes).values({
    id: novoId,
    userId,
    nome: nomeLimpo,
    telefone: telefone ?? '',
    telefone2: '',
    email: '',
    endereco: endereco ?? '',
    bairro: '',
    cidade: '',
    observacoes: '',
    createdAt: now,
    updatedAt: now,
  })
  return novoId
}

export async function salvarOrcamento(dados: {
  id?: string
  clienteId?: string
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

  // Vincula (ou cria) o cliente no cadastro central
  const clienteId = await resolverClienteId(
    userId,
    dados.clienteId,
    dados.clienteNome,
    dados.clienteTelefone,
    dados.clienteEndereco,
  )

  await db
    .insert(orcamentos)
    .values({
      id,
      userId,
      clienteId,
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
        clienteId,
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
