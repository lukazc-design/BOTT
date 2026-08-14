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

// ─── OrçaFacil: Orcamentos ──────────────────────────────────────────────────

export const orcamentos = pgTable('orcamentos', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
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
