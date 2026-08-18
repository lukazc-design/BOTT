import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

// ─── Better Auth required tables ────────────────────────────────────────────

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull(),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
})

// ─── OrçaFacil: Licencas ────────────────────────────────────────────────────
// status: 'trial' | 'active' | 'expired'

export const licenses = pgTable('licenses', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),         // sem FK para facilitar iteracao
  status: text('status').notNull().default('trial'), // trial | active | expired
  plano: text('plano'),                     // basico | pro (null enquanto trial/expirado)
  trialStartedAt: timestamp('trialStartedAt').notNull(),
  trialEndsAt: timestamp('trialEndsAt').notNull(),
  activatedAt: timestamp('activatedAt'),
  stripeSubscriptionId: text('stripeSubscriptionId'),
  stripeCustomerId: text('stripeCustomerId'),
  createdAt: timestamp('createdAt').notNull(),
})

// ─── OrçaFacil: Perfil da empresa do tecnico ────────────────────────────────

export const technicianProfiles = pgTable('technician_profiles', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().unique(),
  empresa: text('empresa').notNull().default(''),
  cnpj: text('cnpj').default(''),
  telefone: text('telefone').default(''),
  email: text('email').default(''),
  corPrimaria: text('corPrimaria').default('#0ea5e9'),
  layoutOrcamento: text('layoutOrcamento').default('classico'),
  validadeOrcamentoDias: integer('validadeOrcamentoDias').default(30),
  margemLucro: integer('margemLucro').default(100),
  observacoesPadrao: text('observacoesPadrao').default(''),
  logoBase64: text('logoBase64'),
  updatedAt: timestamp('updatedAt').notNull(),
})

// ─── OrçaFacil: Atividade e permissões do usuário (painel de admin) ─────────
// Guarda flags de acesso/admin e métricas de uso (nº de acessos, tempo, último).

export const userActivity = pgTable('user_activity', {
  userId: text('userId').primaryKey(),
  acessoLiberado: boolean('acessoLiberado').notNull().default(false), // acesso manual concedido pelo admin
  isAdmin: boolean('isAdmin').notNull().default(false),                // promovido a administrador
  acessos: integer('acessos').notNull().default(0),                    // quantas vezes abriu o sistema
  tempoTotalSegundos: integer('tempoTotalSegundos').notNull().default(0), // tempo total de uso (heartbeat)
  ultimoAcesso: timestamp('ultimoAcesso'),
  createdAt: timestamp('createdAt').notNull(),
})

// ─── OrçaFacil: Registro de uso da IA (para o painel de custos) ─────────────
// Cada chamada da IA na nuvem grava tokens consumidos, para estimar custo.

export const aiUsage = pgTable('ai_usage', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  model: text('model').notNull().default('google/gemini-2.5-flash'),
  provedor: text('provedor').notNull().default('nuvem'), // nuvem | local
  inputTokens: integer('inputTokens').notNull().default(0),
  outputTokens: integer('outputTokens').notNull().default(0),
  createdAt: timestamp('createdAt').notNull(),
})

// ─── OrçaFacil: Clientes (entidade central da gestão) ───────────────────────
// Cada cliente é reaproveitável: concentra aparelhos, atendimentos e orçamentos.

export const clientes = pgTable('clientes', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  nome: text('nome').notNull(),
  telefone: text('telefone').notNull().default(''),   // principal (usado no WhatsApp/ligar)
  telefone2: text('telefone2').notNull().default(''),
  email: text('email').notNull().default(''),
  endereco: text('endereco').notNull().default(''),
  bairro: text('bairro').notNull().default(''),
  cidade: text('cidade').notNull().default(''),
  observacoes: text('observacoes').notNull().default(''),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

// ─── OrçaFacil: Aparelhos instalados no cliente ─────────────────────────────
// Base dos alertas de manutenção: cada aparelho tem intervalo e próxima data.

export const aparelhos = pgTable('aparelhos', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  clienteId: text('clienteId').notNull(),
  tipo: text('tipo').notNull().default('Split'),       // Split, Janela, Cassete, Piso-teto...
  marca: text('marca').notNull().default(''),
  modelo: text('modelo').notNull().default(''),
  btu: integer('btu').notNull().default(0),
  tensao: text('tensao').notNull().default(''),        // 110V / 220V
  gas: text('gas').notNull().default(''),              // R410A, R32...
  ambiente: text('ambiente').notNull().default(''),    // "Sala", "Quarto casal"...
  dataInstalacao: timestamp('dataInstalacao'),
  intervaloLimpezaMeses: integer('intervaloLimpezaMeses').notNull().default(6),
  ultimaLimpeza: timestamp('ultimaLimpeza'),
  proximaManutencao: timestamp('proximaManutencao'),
  observacoes: text('observacoes').notNull().default(''),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

// ─── OrçaFacil: Funcionários / ajudantes ────────────────────────────────────
// Equipe do técnico. O salário-base e o dia de pagamento ajudam a gerar a folha.

export const funcionarios = pgTable('funcionarios', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  nome: text('nome').notNull(),
  funcao: text('funcao').notNull().default('Ajudante'), // Ajudante, Técnico, Auxiliar...
  telefone: text('telefone').notNull().default(''),
  salario: integer('salario').notNull().default(0),      // salário-base em centavos
  diaPagamento: integer('diaPagamento').notNull().default(5), // dia do mês (1-31); 0 = sem fixo
  ativo: boolean('ativo').notNull().default(true),
  observacoes: text('observacoes').notNull().default(''),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

// ─── OrçaFacil: Lançamentos (fluxo de caixa unificado) ──────────────────────
// Entradas (receitas) e saídas (despesas). Pagamentos de salário viram uma
// despesa com categoria 'salario' e funcionarioId preenchido.

export const lancamentos = pgTable('lancamentos', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  tipo: text('tipo').notNull(),           // 'receita' | 'despesa'
  categoria: text('categoria').notNull().default('outros'),
  descricao: text('descricao').notNull().default(''),
  valor: integer('valor').notNull().default(0), // em centavos, sempre positivo
  data: timestamp('data').notNull(),
  funcionarioId: text('funcionarioId'),   // preenchido quando é pagamento de salário
  orcamentoId: text('orcamentoId'),       // preenchido quando a receita vem de um orçamento
  createdAt: timestamp('createdAt').notNull(),
})

// ─── OrçaFacil: Orcamentos ──────────────────────────────────────────────────

export const orcamentos = pgTable('orcamentos', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  clienteId: text('clienteId'), // vínculo opcional ao cadastro de clientes
  clienteNome: text('clienteNome').notNull().default(''),
  clienteEndereco: text('clienteEndereco').default(''),
  clienteTelefone: text('clienteTelefone').default(''),
  observacoes: text('observacoes').default(''),
  // JSON serializado dos equipamentos e itens (simplicidade > normalização agora)
  equipamentosJson: text('equipamentosJson').notNull().default('[]'),
  itensJson: text('itensJson').notNull().default('[]'),
  totalCusto: integer('totalCusto').notNull().default(0),  // em centavos
  totalVenda: integer('totalVenda').notNull().default(0),  // em centavos
  status: text('status').notNull().default('rascunho'), // rascunho | enviado | aprovado
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})
