'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { DadosAdmin, UsuarioAdmin } from '@/lib/actions/admin'
import {
  Users,
  Clock,
  BadgeCheck,
  FileText,
  Search,
  ArrowLeft,
  TrendingUp,
  Mail,
  MailCheck,
} from 'lucide-react'

function fmtData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtReais(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_INFO: Record<
  UsuarioAdmin['licencaStatus'],
  { label: string; classe: string }
> = {
  active: { label: 'Ativa', classe: 'bg-profit/15 text-profit border-profit/30' },
  trial: { label: 'Teste', classe: 'bg-primary/15 text-primary border-primary/30' },
  expired: { label: 'Expirada', classe: 'bg-destructive/15 text-destructive border-destructive/30' },
  'sem-licenca': { label: 'Sem licença', classe: 'bg-muted text-muted-foreground border-border' },
}

function StatCard({
  icon,
  rotulo,
  valor,
  destaque,
}: {
  icon: React.ReactNode
  rotulo: string
  valor: string
  destaque?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-primary">
          {icon}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide">{rotulo}</span>
      </div>
      <div>
        <p className="text-3xl font-bold leading-none">{valor}</p>
        {destaque && <p className="text-xs text-muted-foreground mt-1.5">{destaque}</p>}
      </div>
    </div>
  )
}

export function AdminDashboard({ dados }: { dados: DadosAdmin }) {
  const { resumo, usuarios } = dados
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<'todos' | UsuarioAdmin['licencaStatus']>('todos')

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return usuarios.filter((u) => {
      const casaBusca =
        !termo ||
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo)
      const casaFiltro = filtro === 'todos' || u.licencaStatus === filtro
      return casaBusca && casaFiltro
    })
  }, [usuarios, busca, filtro])

  const filtros: { id: typeof filtro; label: string; n: number }[] = [
    { id: 'todos', label: 'Todos', n: resumo.totalUsuarios },
    { id: 'active', label: 'Ativos', n: resumo.ativos },
    { id: 'trial', label: 'Em teste', n: resumo.emTeste },
    { id: 'expired', label: 'Expirados', n: resumo.expirados },
  ]

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        {/* Cabeçalho */}
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
            >
              <ArrowLeft size={14} /> Voltar ao app
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-balance">
              Painel do Administrador
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Acompanhe cadastros, licenças e uso do OrçaFacil-Frio.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
            <TrendingUp size={18} className="text-profit" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Receita mensal estimada</p>
              <p className="text-lg font-bold leading-none">{fmtReais(resumo.receitaMensalCentavos)}</p>
            </div>
          </div>
        </header>

        {/* Cards de resumo */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          <StatCard
            icon={<Users size={16} />}
            rotulo="Cadastros"
            valor={String(resumo.totalUsuarios)}
            destaque={`+${resumo.novosUltimos7Dias} nos últimos 7 dias`}
          />
          <StatCard
            icon={<BadgeCheck size={16} />}
            rotulo="Licenças ativas"
            valor={String(resumo.ativos)}
            destaque="Pagantes"
          />
          <StatCard
            icon={<Clock size={16} />}
            rotulo="Em teste"
            valor={String(resumo.emTeste)}
            destaque="Trial em andamento"
          />
          <StatCard
            icon={<FileText size={16} />}
            rotulo="Orçamentos"
            valor={String(resumo.totalOrcamentos)}
            destaque="Total criados"
          />
        </section>

        {/* Barra de busca + filtros */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {filtros.map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium border transition-colors ${
                  filtro === f.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {f.label} <span className="opacity-70">({f.n})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tabela (desktop) */}
        <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Licença</th>
                <th className="px-4 py-3 font-medium">Plano</th>
                <th className="px-4 py-3 font-medium text-center">Orçamentos</th>
                <th className="px-4 py-3 font-medium">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-xs font-bold uppercase shrink-0">
                        {u.nome?.[0] ?? '?'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{u.nome}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          {u.emailVerificado ? (
                            <MailCheck size={11} className="text-profit shrink-0" />
                          ) : (
                            <Mail size={11} className="shrink-0" />
                          )}
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_INFO[u.licencaStatus].classe}`}
                    >
                      {STATUS_INFO[u.licencaStatus].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{u.plano ?? '—'}</td>
                  <td className="px-4 py-3 text-center font-medium">{u.totalOrcamentos}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtData(u.cadastradoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtrados.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-10">Nenhum usuário encontrado.</p>
          )}
        </div>

        {/* Cards (mobile) */}
        <div className="md:hidden space-y-3">
          {filtrados.map((u) => (
            <div key={u.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-sm font-bold uppercase shrink-0">
                    {u.nome?.[0] ?? '?'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{u.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_INFO[u.licencaStatus].classe}`}
                >
                  {STATUS_INFO[u.licencaStatus].label}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
                <span className="capitalize">{u.plano ?? 'sem plano'}</span>
                <span>{u.totalOrcamentos} orçamentos</span>
                <span>{fmtData(u.cadastradoEm)}</span>
              </div>
            </div>
          ))}
          {filtrados.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-10">Nenhum usuário encontrado.</p>
          )}
        </div>
      </div>
    </div>
  )
}
