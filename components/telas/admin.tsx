'use client'

import { useEffect, useState } from 'react'
import {
  ShieldCheck, Users, KeyRound, Activity, Search, Loader2, RefreshCw,
  Check, X, Sparkles, Wallet, Cpu, TrendingUp, DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  listarUsuarios, getAdminStats, alternarAcesso, alternarAdmin,
  type PainelAdmin, type UsuarioAdmin, type AdminStats,
} from '@/lib/actions/admin'

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function usd(v: number) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 })
}
function num(v: number) {
  return v.toLocaleString('pt-BR')
}
function fmtTempo(seg: number): string {
  if (!seg || seg < 60) return `${seg || 0}s`
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}
function fmtData(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const hoje = new Date()
  const mesmoDia = d.toDateString() === hoje.toDateString()
  if (mesmoDia) return `Hoje, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const ROTULO_ACESSO: Record<UsuarioAdmin['origemAcesso'], { txt: string; cor: string }> = {
  admin: { txt: 'Admin', cor: 'bg-primary/15 text-primary' },
  liberado: { txt: 'Liberado', cor: 'bg-profit/15 text-profit' },
  assinante: { txt: 'Assinante', cor: 'bg-profit/15 text-profit' },
  trial: { txt: 'Teste', cor: 'bg-cost/15 text-cost' },
  expirado: { txt: 'Sem acesso', cor: 'bg-muted text-muted-foreground' },
}

export function Admin() {
  const [painel, setPainel] = useState<PainelAdmin | null>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState<string | null>(null)

  async function carregar() {
    setCarregando(true)
    setErro(false)
    try {
      const [p, s] = await Promise.all([listarUsuarios(), getAdminStats()])
      if (!p) { setErro(true); return }
      setPainel(p)
      setStats(s)
    } catch {
      setErro(true)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  // Atualiza um usuário localmente sem recarregar tudo
  function patchUsuario(userId: string, patch: Partial<UsuarioAdmin>) {
    setPainel(prev => {
      if (!prev) return prev
      const usuarios = prev.usuarios.map(u => u.userId === userId ? { ...u, ...patch } : u)
      return {
        ...prev,
        usuarios,
        comAcesso: usuarios.filter(u => u.temAcesso).length,
        admins: usuarios.filter(u => u.isAdmin).length,
      }
    })
  }

  async function onToggleAcesso(u: UsuarioAdmin) {
    const novo = !u.acessoLiberado
    setSalvando(u.userId + ':acesso')
    patchUsuario(u.userId, {
      acessoLiberado: novo,
      temAcesso: novo || u.origemAcesso === 'assinante' || u.origemAcesso === 'trial' || u.isAdmin,
      origemAcesso: novo && !u.isAdmin && u.origemAcesso === 'expirado' ? 'liberado' : u.origemAcesso,
    })
    const res = await alternarAcesso(u.userId, novo)
    if (!res.ok) { patchUsuario(u.userId, { acessoLiberado: !novo }); await carregar() }
    setSalvando(null)
  }

  async function onToggleAdmin(u: UsuarioAdmin) {
    const novo = !u.isAdmin
    setSalvando(u.userId + ':admin')
    const res = await alternarAdmin(u.userId, novo)
    if (res.ok) patchUsuario(u.userId, { isAdmin: novo, temAcesso: novo ? true : u.temAcesso })
    setSalvando(null)
  }

  if (carregando) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    )
  }

  if (erro || !painel) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="font-semibold text-destructive">Acesso restrito</p>
          <p className="text-sm text-muted-foreground mt-1">Este painel é exclusivo de administradores.</p>
        </div>
      </div>
    )
  }

  const termo = busca.trim().toLowerCase()
  const filtrados = termo
    ? painel.usuarios.filter(u => u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo))
    : painel.usuarios

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="text-primary mt-1 shrink-0" size={26} />
          <div>
            <h1 className="text-2xl font-bold text-foreground text-balance">Administração de acessos</h1>
            <p className="text-muted-foreground text-sm mt-0.5 max-w-2xl text-pretty">
              Gerencie quem pode usar o sistema, promova administradores e acompanhe quantas vezes e por quanto tempo cada usuário acessou.
            </p>
          </div>
        </div>
        <button
          onClick={carregar}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardResumo icon={<Users size={18} />} titulo="Usuários" valor={num(painel.totalUsuarios)} />
        <CardResumo icon={<KeyRound size={18} />} titulo="Com acesso" valor={num(painel.comAcesso)} cor="text-profit" />
        <CardResumo icon={<ShieldCheck size={18} />} titulo="Admins" valor={num(painel.admins)} cor="text-primary" />
        <CardResumo icon={<Activity size={18} />} titulo="Acessos totais" valor={num(painel.acessosTotais)} />
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail…"
          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      {/* Tabela de usuários */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="font-medium px-4 py-3">Usuário</th>
                <th className="font-medium px-4 py-3">Acesso</th>
                <th className="font-medium px-4 py-3 text-center">Acessos</th>
                <th className="font-medium px-4 py-3">Tempo total</th>
                <th className="font-medium px-4 py-3">Último acesso</th>
                <th className="font-medium px-4 py-3 text-center">Liberar</th>
                <th className="font-medium px-4 py-3 text-center">Admin</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(u => {
                const rot = ROTULO_ACESSO[u.origemAcesso]
                return (
                  <tr key={u.userId} className="border-b border-border/60 last:border-0 hover:bg-accent/40 transition-colors">
                    {/* Usuário */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                          {u.nome.trim().charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-[180px]">{u.nome || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Badge de acesso */}
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', rot.cor)}>
                        {rot.txt}
                      </span>
                    </td>
                    {/* Acessos */}
                    <td className="px-4 py-3 text-center tabular-nums text-foreground">{num(u.acessos)}</td>
                    {/* Tempo total */}
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{fmtTempo(u.tempoTotalSegundos)}</td>
                    {/* Último acesso */}
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtData(u.ultimoAcesso)}</td>
                    {/* Liberar */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <Toggle
                          ativo={u.acessoLiberado}
                          carregando={salvando === u.userId + ':acesso'}
                          onClick={() => onToggleAcesso(u)}
                          titulo={u.acessoLiberado ? 'Bloquear acesso manual' : 'Liberar acesso manual'}
                        />
                      </div>
                    </td>
                    {/* Admin */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <Toggle
                          ativo={u.isAdmin}
                          carregando={salvando === u.userId + ':admin'}
                          onClick={() => onToggleAdmin(u)}
                          titulo={u.isAdmin ? 'Remover admin' : 'Tornar admin'}
                          cor="primary"
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumo financeiro */}
      {stats && (
        <section className="space-y-4 pt-2">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Wallet size={15} className="text-primary" /> Faturamento e custos do mês
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CardMetrica
              icon={<Wallet size={18} />} cor="text-profit" titulo="Receita mensal"
              valor={brl(stats.receitaMensalBRL)}
              legenda={`${stats.assinantesBasico + stats.assinantesPro} assinante(s) ativo(s)`}
            />
            <CardMetrica
              icon={<Cpu size={18} />} cor="text-cost" titulo="Custo de IA (mês)"
              valor={brl(stats.custoMesBRL)}
              legenda={`≈ ${usd(stats.custoMesUSD)} no AI Gateway`}
            />
            <CardMetrica
              icon={<TrendingUp size={18} />}
              cor={stats.receitaMensalBRL - stats.custoMesBRL >= 0 ? 'text-profit' : 'text-destructive'}
              titulo="Margem (receita − IA)"
              valor={brl(stats.receitaMensalBRL - stats.custoMesBRL)}
              legenda={stats.receitaMensalBRL > 0 ? `IA consome ${((stats.custoMesBRL / stats.receitaMensalBRL) * 100).toFixed(1)}% da receita` : 'Sem receita ainda'}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <CardMini titulo="Gerações hoje" valor={num(stats.geracoesHoje)} />
            <CardMini titulo="Gerações no mês" valor={num(stats.geracoesMes)} />
            <CardMini titulo="Gerações total" valor={num(stats.geracoesTotal)} />
            <CardMini titulo="Tokens (mês)" valor={num(stats.inputTokensMes + stats.outputTokensMes)} />
          </div>
          <div className="rounded-xl border border-border bg-card/50 p-4 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
            <DollarSign size={14} className="mt-0.5 shrink-0" />
            <p>
              Os custos de IA são uma <strong>estimativa</strong> pelos tokens consumidos. O valor oficial cobrado está no{' '}
              <strong>Vercel AI Gateway</strong> (vercel.com → seu time → AI Gateway → Usage).
            </p>
          </div>
        </section>
      )}
    </div>
  )
}

function Toggle({ ativo, carregando, onClick, titulo, cor = 'profit' }: {
  ativo: boolean; carregando: boolean; onClick: () => void; titulo: string; cor?: 'profit' | 'primary'
}) {
  const corAtiva = cor === 'primary' ? 'bg-primary' : 'bg-profit'
  return (
    <button
      onClick={onClick}
      disabled={carregando}
      title={titulo}
      aria-label={titulo}
      aria-pressed={ativo}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-60',
        ativo ? corAtiva : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'inline-flex h-5 w-5 items-center justify-center rounded-full bg-background shadow transition-transform',
          ativo ? 'translate-x-5' : 'translate-x-0.5'
        )}
      >
        {carregando
          ? <Loader2 size={11} className="animate-spin text-muted-foreground" />
          : ativo
            ? <Check size={11} className={cor === 'primary' ? 'text-primary' : 'text-profit'} />
            : <X size={11} className="text-muted-foreground" />}
      </span>
    </button>
  )
}

function CardResumo({ icon, titulo, valor, cor }: { icon: React.ReactNode; titulo: string; valor: string; cor?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent">{icon}</span>
        <span className="text-xs">{titulo}</span>
      </div>
      <p className={cn('text-2xl font-bold mt-2', cor ?? 'text-foreground')}>{valor}</p>
    </div>
  )
}

function CardMetrica({ icon, cor, titulo, valor, legenda }: {
  icon: React.ReactNode; cor: string; titulo: string; valor: string; legenda: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className={cn('flex items-center justify-center', cor)}>{icon}</span>
        <span className="text-xs text-muted-foreground">{titulo}</span>
      </div>
      <p className={cn('text-2xl font-bold', cor)}>{valor}</p>
      <p className="text-[11px] text-muted-foreground">{legenda}</p>
    </div>
  )
}

function CardMini({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="text-xl font-bold text-foreground mt-1">{valor}</p>
    </div>
  )
}
