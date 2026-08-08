import { buscarEspec, especGenericaPorBtu } from './dados-tecnicos'
import type {
  EquipamentoOrcamento,
  ItemOrcamento,
  PerfilTecnico,
} from './tipos'

// ─── NOMENCLATURA ────────────────────────────────────────────────────────────
// Padrão do setor: capacidade em "BTU/h" com número cheio (ex.: 24.000 BTU/h)
export function formatarBtu(btu: number): string {
  return `${Math.round(btu).toLocaleString('pt-BR')} BTU/h`
}

const ROTULO_TIPO: Record<string, string> = {
  'hi-wall': 'Hi-Wall', 'piso-teto': 'Piso-Teto', 'cassete': 'Cassete',
  'bi-split': 'Bi-Split', 'tri-split': 'Tri-Split', 'quadri-split': 'Quadri-Split',
  'janela': 'Janela',
}
export function rotuloTipo(tipo: string): string {
  return ROTULO_TIPO[tipo] ?? tipo.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Nome comercial completo do aparelho (usado em listagens e no split)
export function nomeEquipamento(eq: { marca: string; tipo: string; btu: number }): string {
  const marca = eq.marca && eq.marca !== 'Genérico' ? `${eq.marca} ` : ''
  return `Split ${rotuloTipo(eq.tipo)} ${formatarBtu(eq.btu)}${marca ? ` — ${eq.marca}` : ''}`
}

// ─── DISTÂNCIA PADRÃO E CARGA DE GÁS ────────────────────────────────────────
// Conforme ABNT: tubulação padrão 7,5m — acima disso precisa carga adicional

const DISTANCIA_PADRAO_GAS = 7.5 // metros

function calcularCargaGas(distancia: number): string {
  if (distancia <= DISTANCIA_PADRAO_GAS) return 'padrão (incluso no equipamento)'
  const metros = distancia - DISTANCIA_PADRAO_GAS
  // ~20g de gás R-410A por metro adicional (norma fabricante)
  const gramas = Math.ceil(metros * 20)
  return `acréscimo de ${gramas}g por ${metros.toFixed(1)}m extra`
}

// ─── SUPORTES E ACESSÓRIOS ───────────────────────────────────────────────────

function calcularSuportes(distancia: number): number {
  // 1 suporte a cada 1,5m de tubulação (norma ABNT)
  return Math.max(1, Math.ceil(distancia / 1.5))
}

function calcularFlexiveis(distancia: number): number {
  // 2 flexíveis por equipamento (entrada e saída unidade ext.)
  return 2
}

function calcularBracadeiras(distancia: number): number {
  // 1 braçadeira a cada 0,8m
  return Math.max(2, Math.ceil(distancia / 0.8))
}

// ─── MAPA DE MATERIAIS ───────────────────────────────────────────────────────

function encontrarMaterial(
  perfil: PerfilTecnico,
  nomeParcial: string
): PerfilTecnico['materiais'][0] | undefined {
  return perfil.materiais.find(m =>
    m.nome.toLowerCase().includes(nomeParcial.toLowerCase())
  )
}

// ─── GERAR ITENS DE UM EQUIPAMENTO ──────────────────────────────────────────

export function gerarItensEquipamento(
  eq: EquipamentoOrcamento,
  perfil: PerfilTecnico
): ItemOrcamento[] {
  const itens: ItemOrcamento[] = []
  const dist = eq.distanciaTubulacao

  const push = (
    descricao: string,
    quantidade: number,
    unidade: string,
    categoria: ItemOrcamento['categoria'],
    nomeMaterial: string
  ) => {
    const mat = encontrarMaterial(perfil, nomeMaterial)
    itens.push({
      id: crypto.randomUUID(),
      equipamentoId: eq.id,
      descricao,
      quantidade: Math.round(quantidade * 10) / 10,
      unidade,
      precoCusto: mat ? mat.precoCusto * quantidade : 0,
      precoVenda: mat ? mat.precoVenda * quantidade : 0,
      categoria,
    })
  }

  // Tubulação de alta pressão (antiga "líquido")
  push(
    `Tubulação de alta pressão ${eq.tubulacaoLiquido} — ${eq.marca} ${formatarBtu(eq.btu)} (${eq.ambiente})`,
    dist,
    'm',
    'material',
    eq.tubulacaoLiquido
  )

  // Tubulação de baixa pressão (antiga "sucção/gás")
  push(
    `Tubulação de baixa pressão ${eq.tubulacaoSuccao} — ${eq.marca} ${formatarBtu(eq.btu)} (${eq.ambiente})`,
    dist,
    'm',
    'material',
    eq.tubulacaoSuccao
  )

  // Cabo interligação (quantidade de equipamentos × metros)
  push(
    `Cabo interligação ${eq.caboInterligacao} — ${eq.ambiente}`,
    dist * eq.quantidade,
    'm',
    'material',
    `Fio ${eq.caboInterligacao}`
  )

  // Cabo alimentação
  push(
    `Cabo alimentação ${eq.caboAlimentacao} — ${eq.ambiente}`,
    dist * eq.quantidade,
    'm',
    'material',
    `Fio ${eq.caboAlimentacao}`
  )

  // Disjuntor
  const matDisj = encontrarMaterial(perfil, `Disjuntor ${eq.disjuntor}`)
  itens.push({
    id: crypto.randomUUID(),
    equipamentoId: eq.id,
    descricao: `Disjuntor ${eq.disjuntor} — ${eq.ambiente}`,
    quantidade: eq.quantidade,
    unidade: 'un',
    precoCusto: matDisj ? matDisj.precoCusto * eq.quantidade : 0,
    precoVenda: matDisj ? matDisj.precoVenda * eq.quantidade : 0,
    categoria: 'material',
  })

  // Flexíveis
  const flexiveis = calcularFlexiveis(dist) * eq.quantidade
  const matFlex = encontrarMaterial(perfil, 'Flexível')
  itens.push({
    id: crypto.randomUUID(),
    equipamentoId: eq.id,
    descricao: `Flexíveis de vibração — ${eq.ambiente}`,
    quantidade: flexiveis,
    unidade: 'un',
    precoCusto: matFlex ? matFlex.precoCusto * flexiveis : 0,
    precoVenda: matFlex ? matFlex.precoVenda * flexiveis : 0,
    categoria: 'material',
  })

  // Suportes
  const suportes = calcularSuportes(dist) * eq.quantidade
  const matSup = encontrarMaterial(perfil, 'Suporte')
  itens.push({
    id: crypto.randomUUID(),
    equipamentoId: eq.id,
    descricao: `Suportes externos — ${eq.ambiente}`,
    quantidade: suportes,
    unidade: 'un',
    precoCusto: matSup ? matSup.precoCusto * suportes : 0,
    precoVenda: matSup ? matSup.precoVenda * suportes : 0,
    categoria: 'material',
  })

  // Braçadeiras
  const bracadeiras = calcularBracadeiras(dist) * eq.quantidade
  const matBrac = encontrarMaterial(perfil, 'Braçadeira')
  itens.push({
    id: crypto.randomUUID(),
    equipamentoId: eq.id,
    descricao: `Braçadeiras de fixação — ${eq.ambiente}`,
    quantidade: bracadeiras,
    unidade: 'un',
    precoCusto: matBrac ? matBrac.precoCusto * bracadeiras : 0,
    precoVenda: matBrac ? matBrac.precoVenda * bracadeiras : 0,
    categoria: 'material',
  })

  // Proteção UV da tubulação
  push(`Proteção UV da tubulação — ${eq.ambiente}`, dist * eq.quantidade, 'm', 'material', 'Proteção UV')

  // Dreno
  push(`Dreno — ${eq.ambiente}`, dist * eq.quantidade, 'm', 'material', 'Dreno')

  // Serviço de instalação
  const servico = determinarServico(eq, perfil)
  if (servico) {
    itens.push({
      id: crypto.randomUUID(),
      equipamentoId: eq.id,
      descricao: servico.nome,
      quantidade: eq.quantidade,
      unidade: 'un',
      precoCusto: servico.precoCusto * eq.quantidade,
      precoVenda: servico.precoVenda * eq.quantidade,
      categoria: 'servico',
    })

    // Metro adicional se distância > 5m (padrão de instalação)
    if (dist > 5) {
      const svMetro = perfil.servicos.find(s =>
        s.nome.toLowerCase().includes('metro adicional')
      )
      const metrosExtras = dist - 5
      if (svMetro) {
        itens.push({
          id: crypto.randomUUID(),
          equipamentoId: eq.id,
          descricao: `Metro adicional de tubulação (${metrosExtras.toFixed(1)}m × ${eq.quantidade} unid.) — ${eq.ambiente}`,
          quantidade: metrosExtras * eq.quantidade,
          unidade: 'm',
          precoCusto: svMetro.precoCusto * metrosExtras * eq.quantidade,
          precoVenda: svMetro.precoVenda * metrosExtras * eq.quantidade,
          categoria: 'servico',
        })
      }
    }
  }

  return itens
}

function determinarServico(
  eq: EquipamentoOrcamento,
  perfil: PerfilTecnico
): PerfilTecnico['servicos'][0] | undefined {
  if (eq.tipo === 'cassete') {
    return perfil.servicos.find(s => s.nome.toLowerCase().includes('cassete'))
  }
  if (eq.tipo === 'piso-teto') {
    if (eq.btu >= 48000) {
      return perfil.servicos.find(s => s.nome.toLowerCase().includes('piso teto 48'))
    }
    return perfil.servicos.find(s => s.nome.toLowerCase().includes('piso teto até'))
  }
  // Hi-Wall e demais
  if (eq.btu <= 12000) {
    return perfil.servicos.find(s => s.nome.toLowerCase().includes('hi-wall até 12'))
  }
  if (eq.btu <= 22000) {
    return perfil.servicos.find(s => s.nome.toLowerCase().includes('18.000'))
  }
  return perfil.servicos.find(s => s.nome.toLowerCase().includes('24.000'))
}

// ─── MONTAR EQUIPAMENTO COM SPEC CALCULADO ────────────────────────────────────

export function montarEquipamento(params: {
  marca: string
  tipo: EquipamentoOrcamento['tipo']
  btu: number
  quantidade: number
  ambiente: string
  distancia: number
  tensao: '110V' | '220V'
}): EquipamentoOrcamento | null {
  // buscarEspec agora sempre retorna uma spec (com fallback genérico por BTU),
  // mas mantemos a proteção caso o BTU seja inválido.
  const spec = buscarEspec(params.marca, params.tipo, params.btu) ?? especGenericaPorBtu(params.btu || 12000)

  return {
    id: crypto.randomUUID(),
    marca: params.marca,
    tipo: params.tipo,
    btu: params.btu,
    quantidade: params.quantidade,
    ambiente: params.ambiente,
    distanciaTubulacao: params.distancia,
    tensao: params.tensao,
    caboInterligacao: spec.caboInterligacao,
    caboAlimentacao: spec.caboAlimentacao,
    disjuntor: spec.disjuntor,
    tubulacaoLiquido: spec.liquido,
    tubulacaoSuccao: spec.succao,
    cargaGas: calcularCargaGas(params.distancia),
  }
}

// ─── CALCULAR TOTAIS ─────────────────────────────────────────────────────────

export function calcularTotais(itens: ItemOrcamento[]) {
  const totalCusto = itens.reduce((s, i) => s + i.precoCusto, 0)
  const totalVenda = itens.reduce((s, i) => s + i.precoVenda, 0)
  const lucro = totalVenda - totalCusto
  const margemLucro = totalVenda > 0 ? (lucro / totalVenda) * 100 : 0
  return { totalCusto, totalVenda, lucro, margemLucro }
}

// ─── GERAÇÃO DE NÚMERO DO ORÇAMENTO ─────────────────────────────────────────

export function gerarNumeroOrcamento(orcamentos: { numero: string }[]): string {
  const ano = new Date().getFullYear()
  const existentes = orcamentos
    .map(o => {
      const m = o.numero.match(/ORC-\d{4}-(\d+)/)
      return m ? parseInt(m[1]) : 0
    })
    .filter(n => n > 0)
  const proximo = existentes.length > 0 ? Math.max(...existentes) + 1 : 1
  return `ORC-${ano}-${String(proximo).padStart(3, '0')}`
}
