'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  clientes, funcionarios, lancamentos, orcamentos, aparelhos, technicianProfiles,
} from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Nao autorizado')
  return session.user.id
}

// Valores em centavos
const REAIS = (v: number) => Math.round(v * 100)

// 30 nomes de clientes fictícios
const NOMES_CLIENTES = [
  'João Pereira', 'Maria Souza', 'Carlos Almeida', 'Ana Ribeiro', 'Pedro Santos',
  'Juliana Costa', 'Roberto Lima', 'Fernanda Dias', 'Marcos Oliveira', 'Patrícia Gomes',
  'Rafael Martins', 'Camila Rocha', 'Lucas Ferreira', 'Beatriz Carvalho', 'Bruno Nunes',
  'Larissa Melo', 'Thiago Barros', 'Gabriela Pinto', 'Rodrigo Teixeira', 'Aline Cardoso',
  'Felipe Araújo', 'Vanessa Moreira', 'Diego Ramos', 'Priscila Freitas', 'André Cunha',
  'Sabrina Lopes', 'Gustavo Correia', 'Renata Vieira', 'Leandro Farias', 'Tatiane Rezende',
]

const BAIRROS = ['Centro', 'Jardim América', 'Vila Nova', 'Boa Vista', 'Santa Mônica', 'Parque das Flores']
const CIDADES = ['São Paulo', 'Campinas', 'Guarulhos', 'Santo André']

const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/**
 * Popula a conta logada com um cenário de demonstração realista:
 * - 30 clientes
 * - 2 ajudantes (folha mensal)
 * - Faturamento de R$ 30.000 e lucro de R$ 14.000 no mês atual
 * - Histórico dos 5 meses anteriores (para o gráfico ter evolução)
 *
 * Substitui os dados atuais do usuário (limpa antes de inserir) para que o
 * cenário fique sempre consistente ao rodar de novo.
 */
export async function popularDemonstracao() {
  const userId = await getUserId()
  const agora = new Date()

  // ── 1. Limpa dados anteriores deste usuário ──────────────────────────────
  await db.delete(lancamentos).where(eq(lancamentos.userId, userId))
  await db.delete(aparelhos).where(eq(aparelhos.userId, userId))
  await db.delete(orcamentos).where(eq(orcamentos.userId, userId))
  await db.delete(clientes).where(eq(clientes.userId, userId))
  await db.delete(funcionarios).where(eq(funcionarios.userId, userId))

  // ── 2. Perfil da empresa (o empresário é o próprio técnico) ───────────────
  await db
    .insert(technicianProfiles)
    .values({
      id: randomUUID(),
      userId,
      empresa: 'Refrigeração Ártico',
      cnpj: '12.345.678/0001-90',
      telefone: '(11) 98888-1234',
      email: 'contato@articorefrigeracao.com.br',
      corPrimaria: '#0ea5e9',
      layoutOrcamento: 'moderno',
      validadeOrcamentoDias: 30,
      margemLucro: 100,
      observacoesPadrao: 'Garantia de 90 dias na instalação.',
      updatedAt: agora,
    })
    .onConflictDoUpdate({
      target: technicianProfiles.userId,
      set: { empresa: 'Refrigeração Ártico', updatedAt: agora },
    })

  // ── 3. Dois ajudantes (folha = R$ 3.400/mês) ──────────────────────────────
  const ajudantes = [
    { nome: 'José Ricardo', funcao: 'Ajudante', salario: REAIS(1800), diaPagamento: 5 },
    { nome: 'Paulo Henrique', funcao: 'Ajudante', salario: REAIS(1600), diaPagamento: 5 },
  ]
  const ajudanteIds: string[] = []
  for (const a of ajudantes) {
    const id = randomUUID()
    ajudanteIds.push(id)
    await db.insert(funcionarios).values({
      id, userId, nome: a.nome, funcao: a.funcao, telefone: '',
      salario: a.salario, diaPagamento: a.diaPagamento, ativo: true, observacoes: '',
      createdAt: agora, updatedAt: agora,
    })
  }
  const folhaMensal = ajudantes.reduce((s, a) => s + a.salario, 0) // R$ 3.400

  // ── 4. Trinta clientes ────────────────────────────────────────────────────
  const clienteIds: string[] = []
  for (let i = 0; i < NOMES_CLIENTES.length; i++) {
    const id = randomUUID()
    clienteIds.push(id)
    await db.insert(clientes).values({
      id, userId,
      nome: NOMES_CLIENTES[i],
      telefone: `(11) 9${String(7000 + i).padStart(4, '0')}-${String(1000 + i * 7).slice(0, 4)}`,
      telefone2: '', email: '',
      endereco: `Rua ${i + 1}, nº ${100 + i * 3}`,
      bairro: BAIRROS[i % BAIRROS.length],
      cidade: CIDADES[i % CIDADES.length],
      observacoes: '',
      createdAt: agora, updatedAt: agora,
    })
  }

  // ── 5. Lançamentos do mês atual: R$ 30.000 receita / R$ 16.000 despesa ────
  // Lucro alvo = 30.000 - 16.000 = R$ 14.000
  const lotes: {
    tipo: 'receita' | 'despesa'; categoria: string; descricao: string;
    valor: number; dia: number; funcionarioId?: string
  }[] = []

  // 30 recebimentos de R$ 1.000 (um por cliente) = R$ 30.000
  for (let i = 0; i < 30; i++) {
    lotes.push({
      tipo: 'receita', categoria: 'Serviço',
      descricao: `Instalação/serviço — ${NOMES_CLIENTES[i]}`,
      valor: REAIS(1000), dia: (i % 27) + 1,
    })
  }

  // Despesas do mês (total R$ 16.000)
  // Salários dos 2 ajudantes (R$ 3.400)
  lotes.push({ tipo: 'despesa', categoria: 'salario', descricao: 'Salário — José Ricardo', valor: REAIS(1800), dia: 5, funcionarioId: ajudanteIds[0] })
  lotes.push({ tipo: 'despesa', categoria: 'salario', descricao: 'Salário — Paulo Henrique', valor: REAIS(1600), dia: 5, funcionarioId: ajudanteIds[1] })
  // Materiais / gás / combustível / aluguel (R$ 12.600) → total despesa R$ 16.000
  lotes.push({ tipo: 'despesa', categoria: 'material', descricao: 'Compra de materiais (tubos, cabos, gás)', valor: REAIS(7200), dia: 8 })
  lotes.push({ tipo: 'despesa', categoria: 'combustivel', descricao: 'Combustível e deslocamento', valor: REAIS(1800), dia: 10 })
  lotes.push({ tipo: 'despesa', categoria: 'aluguel', descricao: 'Aluguel da oficina', valor: REAIS(2200), dia: 10 })
  lotes.push({ tipo: 'despesa', categoria: 'outros', descricao: 'Ferramentas e manutenção do veículo', valor: REAIS(1400), dia: 15 })

  // Insere os lançamentos do mês atual
  const anoAtual = agora.getFullYear()
  const mesAtual = agora.getMonth()
  for (const l of lotes) {
    await db.insert(lancamentos).values({
      id: randomUUID(), userId,
      tipo: l.tipo, categoria: l.categoria, descricao: l.descricao,
      valor: l.valor,
      data: new Date(anoAtual, mesAtual, Math.min(l.dia, 28), 12, 0, 0),
      funcionarioId: l.funcionarioId ?? null,
      orcamentoId: null,
      createdAt: agora,
    })
  }

  // ── 6. Histórico dos 5 meses anteriores (evolução no gráfico) ─────────────
  // Receita crescente e lucro proporcional (~45%) para dar sensação de evolução.
  const historico = [
    { receita: REAIS(18000), despesa: REAIS(11000) },
    { receita: REAIS(21000), despesa: REAIS(12500) },
    { receita: REAIS(24000), despesa: REAIS(13800) },
    { receita: REAIS(26500), despesa: REAIS(14800) },
    { receita: REAIS(28000), despesa: REAIS(15400) },
  ]
  for (let k = 0; k < historico.length; k++) {
    // meses -5 .. -1
    const offset = historico.length - k // 5,4,3,2,1
    const d = new Date(anoAtual, mesAtual - offset, 1)
    const rotulo = NOMES_MES[d.getMonth()]
    const { receita, despesa } = historico[k]
    await db.insert(lancamentos).values({
      id: randomUUID(), userId,
      tipo: 'receita', categoria: 'Serviço',
      descricao: `Receitas de ${rotulo}`,
      valor: receita,
      data: new Date(d.getFullYear(), d.getMonth(), 15, 12, 0, 0),
      funcionarioId: null, orcamentoId: null, createdAt: agora,
    })
    await db.insert(lancamentos).values({
      id: randomUUID(), userId,
      tipo: 'despesa', categoria: 'material',
      descricao: `Despesas de ${rotulo}`,
      valor: despesa,
      data: new Date(d.getFullYear(), d.getMonth(), 15, 12, 0, 0),
      funcionarioId: null, orcamentoId: null, createdAt: agora,
    })
  }

  revalidatePath('/')

  const receitasMes = REAIS(30000)
  const despesasMes = REAIS(16000)
  return {
    ok: true as const,
    resumo: {
      clientes: 30,
      ajudantes: 2,
      folhaMensal,
      receitasMes,
      despesasMes,
      lucroMes: receitasMes - despesasMes, // R$ 14.000
    },
  }
}
