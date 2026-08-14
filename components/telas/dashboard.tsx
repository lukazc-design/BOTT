'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, FileText, DollarSign, AlertCircle, Plus, Thermometer, Sparkles } from 'lucide-react'
import { carregarOrcamentos } from '@/lib/storage'
import { MAX_ORCAMENTOS } from '@/lib/tipos'
import type { Orcamento } from '@/lib/tipos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<Orcamento['status'], string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
}
const STATUS_COLOR: Record<Orcamento['status'], string> = {
  rascunho: 'border-muted-foreground/30 text-muted-foreground',
  enviado:  'border-cost/40 text-cost',
  aprovado: 'border-profit/40 text-profit',
  recusado: 'border-destructive/40 text-destructive',
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface DashboardProps {
  onNovoOrcamento: () => void
  onAbrirHistorico: () => void
  onAbrirOrcamento?: (o: Orcamento) => void
}

export function Dashboard({ onNovoOrcamento, onAbrirHistorico, onAbrirOrcamento }: DashboardProps) {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])

  useEffect(() => {
    setOrcamentos(carregarOrcamentos())
  }, [])

  const aprovados     = orcamentos.filter(o => o.status === 'aprovado')
  const totalFaturado = aprovados.reduce((s, o) => s + o.totalVenda, 0)
  const totalLucro    = aprovados.reduce((s, o) => s + o.lucro, 0)
  const recentes      = orcamentos.slice(0, 5)
  const vagas         = MAX_ORCAMENTOS - orcamentos.length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Visão geral dos seus orçamentos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onNovoOrcamento} className="gap-2">
            <Plus size={16} />
            Novo Orçamento
          </Button>
          {/* Atalho direto para o chat da IA — azul mais escuro para se destacar do "Novo" */}
          <Button
            onClick={onNovoOrcamento}
            className="gap-2 bg-blue-800 text-white hover:bg-blue-900"
          >
            <Sparkles size={16} />
            IA
          </Button>
        </div>
      </div>

      {/* Alerta de limite */}
      {vagas <= 3 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-cost/10 border border-cost/30">
          <AlertCircle size={18} className="text-cost flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-cost">
              {vagas === 0
                ? 'Limite de orçamentos atingido'
                : `Restam apenas ${vagas} vaga${vagas > 1 ? 's' : ''} de orçamento`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              O plano gratuito suporta até {MAX_ORCAMENTOS} orçamentos salvos. Exclua orçamentos antigos para liberar espaço.
            </p>
          </div>
        </div>
      )}

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total de Orçamentos"
          valor={`${orcamentos.length} / ${MAX_ORCAMENTOS}`}
          icon={FileText}
          cor="text-primary"
        />
        <MetricCard
          label="Aprovados"
          valor={String(aprovados.length)}
          icon={TrendingUp}
          cor="text-profit"
        />
        <MetricCard
          label="Faturado (aprovados)"
          valor={fmt(totalFaturado)}
          icon={DollarSign}
          cor="text-sale"
          pequeno
        />
        <MetricCard
          label="Lucro (aprovados)"
          valor={fmt(totalLucro)}
          icon={TrendingUp}
          cor="text-profit"
          pequeno
        />
      </div>

      {/* Orçamentos recentes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Orçamentos Recentes</h2>
          {orcamentos.length > 5 && (
            <button
              onClick={onAbrirHistorico}
              className="text-xs text-primary hover:underline"
            >
              Ver todos
            </button>
          )}
        </div>

        {orcamentos.length === 0 ? (
          <EmptyState onNovo={onNovoOrcamento} />
        ) : (
          <div className="space-y-2">
            {recentes.map(o => (
              <button
                key={o.id}
                onClick={() => onAbrirOrcamento?.(o)}
                className="w-full text-left flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:border-primary/30 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-md bg-brand-muted flex items-center justify-center flex-shrink-0">
                    <Thermometer size={14} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{o.numero}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {o.clienteNome || 'Cliente não informado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-sale">{fmt(o.totalVenda)}</p>
                    <p className="text-xs text-profit">Lucro: {fmt(o.lucro)}</p>
                  </div>
                  <Badge variant="outline" className={cn('text-xs', STATUS_COLOR[o.status])}>
                    {STATUS_LABEL[o.status]}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  label, valor, icon: Icon, cor, pequeno,
}: {
  label: string
  valor: string
  icon: React.ElementType
  cor: string
  pequeno?: boolean
}) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-3">
      <div className={cn('w-8 h-8 rounded-lg bg-card flex items-center justify-center border border-border', cor)}>
        <Icon size={16} />
      </div>
      <div>
        <p className={cn('font-bold leading-tight', pequeno ? 'text-base' : 'text-xl')}>{valor}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{label}</p>
      </div>
    </div>
  )
}

function EmptyState({ onNovo }: { onNovo: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border border-dashed border-border text-center">
      <div className="w-16 h-16 rounded-full bg-brand-muted flex items-center justify-center mb-4">
        <FileText size={28} className="text-primary" />
      </div>
      <p className="text-base font-medium mb-1">Nenhum orçamento ainda</p>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs">
        Crie seu primeiro orçamento por voz ou texto e deixe a IA calcular tudo automaticamente.
      </p>
      <Button onClick={onNovo} className="gap-2">
        <Plus size={16} />
        Criar primeiro orçamento
      </Button>
    </div>
  )
}
