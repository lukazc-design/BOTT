import type { TipoEquipamento } from './dados-tecnicos'

// ─── PERFIL DO TÉCNICO ───────────────────────────────────────────────────────

export interface PrecoMaterial {
  id: string
  nome: string         // ex: "Fio 1,5mm² (m)"
  unidade: string      // ex: "m", "un", "pc"
  precoCusto: number   // quanto paga
  precoVenda: number   // quanto cobra do cliente
}

export type CategoriaServico =
  | 'instalacao'
  | 'limpeza'
  | 'manutencao'
  | 'vazamento'
  | 'outros'

export const CATEGORIAS_SERVICO: Record<CategoriaServico, string> = {
  instalacao: 'Instalação',
  limpeza: 'Limpeza',
  manutencao: 'Manutenção',
  vazamento: 'Vazamento',
  outros: 'Outros',
}

export interface PrecoServico {
  id: string
  nome: string                   // ex: "Instalação Hi-Wall até 18.000 BTU"
  categoria: CategoriaServico    // tipo do serviço
  precoCusto: number             // custo (mão de obra própria)
  precoVenda: number             // cobrado do cliente
}

export type LayoutOrcamento = 'classico' | 'moderno' | 'minimalista' | 'corporativo'

export const LAYOUTS_ORCAMENTO: Record<LayoutOrcamento, { nome: string; descricao: string }> = {
  classico:     { nome: 'Clássico',     descricao: 'Cabeçalho azul com logo à esquerda e dados à direita' },
  moderno:      { nome: 'Moderno',      descricao: 'Faixa escura no topo, logo centralizada, design atual' },
  minimalista:  { nome: 'Minimalista',  descricao: 'Layout limpo sem cores pesadas, foco no conteúdo' },
  corporativo:  { nome: 'Corporativo',  descricao: 'Duas colunas, identidade visual profissional' },
}

export interface PerfilTecnico {
  nome: string
  empresa: string
  telefone: string
  email: string
  cidade: string
  estado: string
  cnpj?: string
  logoBase64?: string          // imagem em base64 para usar no PDF sem CORS
  layoutOrcamento: LayoutOrcamento
  corPrimaria: string          // hex, ex: "#0ea5e9"
  ollamaUrl: string
  ollamaModel: string
  materiais: PrecoMaterial[]
  servicos: PrecoServico[]
  // Kit de materiais padrão por categoria de serviço: lista de IDs de materiais
  // que o técnico normalmente emprega em cada tipo de serviço (instalação, limpeza…).
  // Ao escolher um serviço no orçamento, o app puxa esses materiais automaticamente.
  kitsMateriais?: Record<CategoriaServico, string[]>
  validadeOrcamentoDias: number
  observacoesPadrao: string
}

// ─── ITEM DO ORÇAMENTO ───────────────────────────────────────────────────────

export interface ItemOrcamento {
  id: string
  equipamentoId?: string   // referência ao EquipamentoOrcamento que gerou este item
  descricao: string
  quantidade: number
  unidade: string
  precoCusto: number
  precoVenda: number
  categoria: 'equipamento' | 'material' | 'servico' | 'outros'
}

export interface EquipamentoOrcamento {
  id: string
  marca: string
  tipo: TipoEquipamento
  btu: number
  quantidade: number
  ambiente: string         // ex: "Sala", "Quarto 1"
  distanciaTubulacao: number // em metros
  tensao: '110V' | '220V'
  // calculado automaticamente:
  caboInterligacao: string
  caboAlimentacao: string
  disjuntor: string
  tubulacaoLiquido: string
  tubulacaoSuccao: string
  cargaGas: string         // "padrão" ou "acréscimo de Xg"
}

export interface Orcamento {
  id: string
  numero: string           // ex: "ORC-2026-001"
  dataCriacao: string      // ISO string
  validade: string         // ISO string
  status: 'rascunho' | 'enviado' | 'aprovado' | 'recusado'

  // Cliente
  clienteNome: string
  clienteEndereco: string
  clienteTelefone: string
  clienteEmail?: string

  // Dados técnicos
  equipamentos: EquipamentoOrcamento[]
  itens: ItemOrcamento[]   // materiais + serviços calculados

  // Totais
  totalCusto: number
  totalVenda: number
  lucro: number
  margemLucro: number      // %

  observacoes: string
  prompt: string           // texto/voz original que gerou o orçamento
}

// ─── STORAGE KEYS ────────────────────────────────────────────────────────────

export const STORAGE_KEY_PERFIL = 'orcafacil_perfil'
export const STORAGE_KEY_ORCAMENTOS = 'orcafacil_orcamentos'
export const MAX_ORCAMENTOS = 200

// ─── PERFIL PADRÃO ───────────────────────────────────────────────────────────

export const PERFIL_PADRAO: PerfilTecnico = {
  nome: '',
  empresa: '',
  telefone: '',
  email: '',
  cidade: '',
  estado: '',
  layoutOrcamento: 'classico',
  corPrimaria: '#0ea5e9',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'qwen2.5:7b',
  validadeOrcamentoDias: 15,
  observacoesPadrao: 'Orçamento válido por {validade} dias. Pagamento: 50% na aprovação e 50% na conclusão.',
  // Kit padrão de materiais por serviço (IDs dos materiais abaixo). O técnico ajusta no perfil.
  kitsMateriais: {
    instalacao: ['5', '6', '1', '2', '11', '12', '13', '19', '20', '14', '16'],
    limpeza:    ['20'],
    manutencao: ['1', '14', '20'],
    vazamento:  ['5', '6', '7', '20'],
    outros:     [],
  },
  materiais: [
    { id: '1', nome: 'Fio 1,5mm² (m)',        unidade: 'm',  precoCusto: 2.5,  precoVenda: 5.0  },
    { id: '2', nome: 'Fio 2,5mm² (m)',        unidade: 'm',  precoCusto: 3.5,  precoVenda: 7.0  },
    { id: '3', nome: 'Fio 4mm² (m)',          unidade: 'm',  precoCusto: 5.5,  precoVenda: 11.0 },
    { id: '4', nome: 'Fio 6mm² (m)',          unidade: 'm',  precoCusto: 8.0,  precoVenda: 16.0 },
    { id: '5', nome: 'Tubulação 1/4" (m)',    unidade: 'm',  precoCusto: 12.0, precoVenda: 24.0 },
    { id: '6', nome: 'Tubulação 3/8" (m)',    unidade: 'm',  precoCusto: 15.0, precoVenda: 30.0 },
    { id: '7', nome: 'Tubulação 1/2" (m)',    unidade: 'm',  precoCusto: 18.0, precoVenda: 36.0 },
    { id: '8', nome: 'Tubulação 5/8" (m)',    unidade: 'm',  precoCusto: 22.0, precoVenda: 44.0 },
    { id: '9', nome: 'Tubulação 3/4" (m)',    unidade: 'm',  precoCusto: 28.0, precoVenda: 56.0 },
    { id:'10', nome: 'Tubulação 7/8" (m)',    unidade: 'm',  precoCusto: 35.0, precoVenda: 70.0 },
    { id:'11', nome: 'Flexível (un)',         unidade: 'un', precoCusto: 18.0, precoVenda: 36.0 },
    { id:'12', nome: 'Suporte externo (un)',  unidade: 'un', precoCusto: 25.0, precoVenda: 50.0 },
    { id:'13', nome: 'Braçadeira (un)',       unidade: 'un', precoCusto: 2.0,  precoVenda: 4.0  },
    { id:'14', nome: 'Disjuntor 10A (un)',    unidade: 'un', precoCusto: 18.0, precoVenda: 36.0 },
    { id:'15', nome: 'Disjuntor 16A (un)',    unidade: 'un', precoCusto: 20.0, precoVenda: 40.0 },
    { id:'16', nome: 'Disjuntor 20A (un)',    unidade: 'un', precoCusto: 22.0, precoVenda: 44.0 },
    { id:'17', nome: 'Disjuntor 25A (un)',    unidade: 'un', precoCusto: 25.0, precoVenda: 50.0 },
    { id:'18', nome: 'Disjuntor 32A (un)',    unidade: 'un', precoCusto: 30.0, precoVenda: 60.0 },
    { id:'19', nome: 'Proteção UV (m)',       unidade: 'm',  precoCusto: 4.0,  precoVenda: 8.0  },
    { id:'20', nome: 'Dreno (m)',             unidade: 'm',  precoCusto: 3.5,  precoVenda: 7.0  },
  ],
  servicos: [
    // Instalação
    { id: 's1',  categoria: 'instalacao', nome: 'Instalação Hi-Wall até 12.000 BTU',        precoCusto: 150, precoVenda: 350  },
    { id: 's2',  categoria: 'instalacao', nome: 'Instalação Hi-Wall 18.000–22.000 BTU',     precoCusto: 200, precoVenda: 450  },
    { id: 's3',  categoria: 'instalacao', nome: 'Instalação Hi-Wall 24.000–30.000 BTU',     precoCusto: 250, precoVenda: 550  },
    { id: 's4',  categoria: 'instalacao', nome: 'Instalação Piso Teto até 36.000 BTU',      precoCusto: 350, precoVenda: 700  },
    { id: 's5',  categoria: 'instalacao', nome: 'Instalação Piso Teto 48.000+ BTU',         precoCusto: 450, precoVenda: 900  },
    { id: 's6',  categoria: 'instalacao', nome: 'Instalação Cassete',                       precoCusto: 400, precoVenda: 800  },
    { id: 's7',  categoria: 'instalacao', nome: 'Metro adicional de tubulação (m)',          precoCusto: 30,  precoVenda: 80   },
    { id: 's8',  categoria: 'instalacao', nome: 'Instalação Bi-Split',                      precoCusto: 350, precoVenda: 750  },
    { id: 's9',  categoria: 'instalacao', nome: 'Instalação Multi-Split (por unidade int.)', precoCusto: 200, precoVenda: 450  },
    // Limpeza
    { id: 'l1',  categoria: 'limpeza',    nome: 'Limpeza Hi-Wall (higienização completa)',   precoCusto: 60,  precoVenda: 180  },
    { id: 'l2',  categoria: 'limpeza',    nome: 'Limpeza Piso Teto',                         precoCusto: 80,  precoVenda: 220  },
    { id: 'l3',  categoria: 'limpeza',    nome: 'Limpeza Cassete',                           precoCusto: 100, precoVenda: 280  },
    { id: 'l4',  categoria: 'limpeza',    nome: 'Limpeza filtros (manutenção simples)',       precoCusto: 30,  precoVenda: 80   },
    { id: 'l5',  categoria: 'limpeza',    nome: 'Higienização completa + anti-mofo',         precoCusto: 90,  precoVenda: 250  },
    // Manutenção
    { id: 'm1',  categoria: 'manutencao', nome: 'Manutenção preventiva Hi-Wall',             precoCusto: 80,  precoVenda: 220  },
    { id: 'm2',  categoria: 'manutencao', nome: 'Manutenção preventiva Piso Teto',           precoCusto: 100, precoVenda: 280  },
    { id: 'm3',  categoria: 'manutencao', nome: 'Recarga de gás R-410A (até 500g)',          precoCusto: 120, precoVenda: 320  },
    { id: 'm4',  categoria: 'manutencao', nome: 'Recarga de gás R-32 (até 500g)',            precoCusto: 100, precoVenda: 280  },
    { id: 'm5',  categoria: 'manutencao', nome: 'Troca de capacitor',                        precoCusto: 40,  precoVenda: 150  },
    { id: 'm6',  categoria: 'manutencao', nome: 'Troca de placa eletrônica',                 precoCusto: 80,  precoVenda: 250  },
    { id: 'm7',  categoria: 'manutencao', nome: 'Limpeza e verificação condensadora',        precoCusto: 90,  precoVenda: 220  },
    { id: 'm8',  categoria: 'manutencao', nome: 'Revisão geral completa',                    precoCusto: 150, precoVenda: 400  },
    // Vazamento
    { id: 'v1',  categoria: 'vazamento',  nome: 'Localização e reparo de vazamento de gás', precoCusto: 120, precoVenda: 350  },
    { id: 'v2',  categoria: 'vazamento',  nome: 'Reparo de tubulação (solda)',               precoCusto: 150, precoVenda: 400  },
    { id: 'v3',  categoria: 'vazamento',  nome: 'Vácuo e pressurização (teste de estanque)', precoCusto: 80,  precoVenda: 200  },
    { id: 'v4',  categoria: 'vazamento',  nome: 'Reparo dreno entupido',                     precoCusto: 50,  precoVenda: 150  },
    { id: 'v5',  categoria: 'vazamento',  nome: 'Reparo dreno + reposição',                  precoCusto: 80,  precoVenda: 220  },
    // Outros
    { id: 'o1',  categoria: 'outros',     nome: 'Visita técnica / diagnóstico',              precoCusto: 50,  precoVenda: 150  },
    { id: 'o2',  categoria: 'outros',     nome: 'Desinstalação de equipamento',              precoCusto: 80,  precoVenda: 200  },
    { id: 'o3',  categoria: 'outros',     nome: 'Relocação de equipamento',                  precoCusto: 200, precoVenda: 500  },
    { id: 'o4',  categoria: 'outros',     nome: 'Hora técnica adicional',                    precoCusto: 60,  precoVenda: 150  },
  ],
}
