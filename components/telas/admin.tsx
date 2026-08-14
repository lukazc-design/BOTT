'use client'

import { useEffect, useState } from 'react'
import {
  Sparkles, DollarSign, Users, TrendingUp, Loader2, RefreshCw, Cpu, Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAdminStats, type AdminStats } from '@/lib/actions/admin'

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function usd(v: number) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 })
}
function num(v: number) {
  return v.toLocaleString('pt-BR')
}

export function Admin() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  async function carregar() {
    setCarregando(true)
    setErro(false)
    try {
      const s = await getAdminStats()
      if (!s) { setErro(true); return }
      setStats(s)
    } catch {
      setErro(true)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  if (carregando) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    )
  }

  if (erro || !stats) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="font-semibold text-destructive">Acesso restrito</p>
          <p className="text-sm text-muted-foreground mt-1">
            Este painel é exclusivo do administrador.
          </p>
        </div>
      </div>
    )
  }

  const receita = stats.receitaMensalBRL
  const custo = stats.custoMesBRL
  const margem = receita - custo
  const totalAssinantes = stats.assinantesBasico + stats.assinantesPro

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel do Admin</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Consumo de IA, assinaturas e custos do mês atual
          </p>
        </div>
        <button
          onClick={carregar}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Resumo financeiro — receita x custo x margem */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CardMetrica
          icon={<Wallet size={18} />}
          cor="text-profit"
          titulo="Receita mensal"
          valor={brl(receita)}
          legenda={`${totalAssinantes} assinante(s) ativo(s)`}
        />
        <CardMetrica
          icon={<Cpu size={18} />}
          cor="text-cost"
          titulo="Custo de IA (mês)"
          valor={brl(custo)}
          legenda={`≈ ${usd(stats.custoMesUSD)} no AI Gateway`}
        />
        <CardMetrica
          icon={<TrendingUp size={18} />}
          cor={margem >= 0 ? 'text-profit' : 'text-destructive'}
          titulo="Margem (receita − IA)"
          valor={brl(margem)}
          legenda={receita > 0 ? `IA consome ${((custo / receita) * 100).toFixed(1)}% da receita` : 'Sem receita ainda'}
        />
      </div>

      {/* Gerações de IA */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles size={15} className="text-primary" /> Gerações de IA
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <CardMini titulo="Hoje" valor={num(stats.geracoesHoje)} />
          <CardMini titulo="Este mês" valor={num(stats.geracoesMes)} />
          <CardMini titulo="Total" valor={num(stats.geracoesTotal)} />
          <CardMini
            titulo="Tokens (mês)"
            valor={num(stats.inputTokensMes + stats.outputTokensMes)}
            legenda={`${num(stats.inputTokensMes)} in · ${num(stats.outputTokensMes)} out`}
          />
        </div>
      </section>

      {/* Assinaturas */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users size={15} className="text-primary" /> Assinaturas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CardPlano nome="Básico" preco="R$ 15/mês" qtd={stats.assinantesBasico} />
          <CardPlano nome="Pro" preco="R$ 30/mês" qtd={stats.assinantesPro} />
          <CardPlano nome="Em teste grátis" preco="trial" qtd={stats.emTrial} discreto />
        </div>
      </section>

      {/* Nota sobre a fonte oficial */}
      <div className="rounded-xl border border-border bg-card/50 p-4 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
        <DollarSign size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
        <p>
          Os custos de IA aqui são uma <strong>estimativa</strong> com base nos tokens consumidos.
          O valor oficial cobrado está no painel do <strong>Vercel AI Gateway</strong> (vercel.com → seu time → AI Gateway → Usage).
        </p>
      </div>
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

function CardMini({ titulo, valor, legenda }: { titulo: string; valor: string; legenda?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="text-xl font-bold text-foreground mt-1">{valor}</p>
      {legenda && <p className="text-[10px] text-muted-foreground mt-0.5">{legenda}</p>}
    </div>
  )
}

function CardPlano({ nome, preco, qtd, discreto }: { nome: string; preco: string; qtd: number; discreto?: boolean }) {
  return (
    <div className={cn(
      'rounded-xl border p-4 flex items-center justify-between',
      discreto ? 'border-border bg-card/50' : 'border-primary/30 bg-primary/5'
    )}>
      <div>
        <p className="text-sm font-semibold text-foreground">{nome}</p>
        <p className="text-[11px] text-muted-foreground">{preco}</p>
      </div>
      <p className={cn('text-2xl font-bold', discreto ? 'text-muted-foreground' : 'text-primary')}>{qtd}</p>
    </div>
  )
}
