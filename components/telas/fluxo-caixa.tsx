'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Wallet, TrendingUp, TrendingDown, Plus, Trash2, X, Save, Loader2,
  ChevronLeft, ChevronRight, ArrowDownCircle, ArrowUpCircle, Calendar, Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  listarLancamentos, salvarLancamento, excluirLancamento, resumoMes,
  type LancamentoInput, type ResumoFinanceiro,
} from '@/lib/actions/financeiro'

type Lancamento = Awaited<ReturnType<typeof listarLancamentos>>[number]

const CATEGORIAS_RECEITA = ['Serviço', 'Instalação', 'Manutenção', 'Venda', 'Outros']
const CATEGORIAS_DESPESA = ['Material', 'Combustível', 'Ferramenta', 'Salário', 'Aluguel', 'Imposto', 'Outros']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function fmtMoeda(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

// Formulário vazio de lançamento, pré-definindo o tipo
function lancamentoVazio(tipo: 'receita' | 'despesa'): LancamentoInput {
  return { tipo, categoria: tipo === 'receita' ? 'Serviço' : 'Material', descricao: '', valor: 0, data: hojeISO() }
}

export function FluxoCaixa({ ativo }: { ativo?: boolean }) {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth())
  const [lista, setLista] = useState<Lancamento[]>([])
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState<LancamentoInput | null>(null)
  const [salvando, setSalvando] = useState(false)
  // valor no input é digitado em reais; converto para centavos ao salvar
  const [valorReais, setValorReais] = useState('')

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try {
      const [l, r] = await Promise.all([listarLancamentos(ano, mes), resumoMes(ano, mes)])
      setLista(l)
      setResumo(r)
    } finally { setCarregando(false) }
  }, [ano, mes])

  useEffect(() => { if (ativo !== false) recarregar() }, [ativo, recarregar])

  const mudarMes = (delta: number) => {
    const d = new Date(ano, mes + delta, 1)
    setAno(d.getFullYear())
    setMes(d.getMonth())
  }

  const abrirNovo = (tipo: 'receita' | 'despesa') => {
    setForm(lancamentoVazio(tipo))
    setValorReais('')
  }

  // Abre o lançamento existente para ver o detalhe e editar
  const abrirEdicao = (l: Lancamento) => {
    setForm({
      id: l.id,
      tipo: l.tipo as 'receita' | 'despesa',
      categoria: l.categoria,
      descricao: l.descricao ?? '',
      valor: l.valor,
      data: new Date(l.data).toISOString().slice(0, 10),
      funcionarioId: l.funcionarioId,
      orcamentoId: l.orcamentoId,
    })
    setValorReais((l.valor / 100).toString())
  }

  const handleSalvar = async () => {
    if (!form) return
    const centavos = Math.round(parseFloat(valorReais.replace(',', '.')) * 100)
    if (!centavos || centavos <= 0) { alert('Informe um valor maior que zero.'); return }
    setSalvando(true)
    try {
      const res = await salvarLancamento({ ...form, valor: centavos })
      if (!res.ok) { alert(res.mensagem); return }
      setForm(null)
      await recarregar()
    } finally { setSalvando(false) }
  }

  const handleExcluir = async (id: string) => {
    if (!window.confirm('Excluir este lançamento?')) return
    await excluirLancamento(id)
    await recarregar()
  }

  // Máximo diário para escalar o gráfico
  const maxDia = useMemo(() => {
    if (!resumo) return 1
    return Math.max(1, ...resumo.porDia.map(d => Math.max(d.receitas, d.despesas)))
  }, [resumo])

  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Wallet size={18} className="text-primary" /> Fluxo de Caixa
            </h1>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card">
              <button onClick={() => mudarMes(-1)} className="p-1.5 hover:bg-muted rounded-l-lg" aria-label="Mês anterior"><ChevronLeft size={16} /></button>
              <span className="text-xs font-medium px-1 min-w-[104px] text-center">{MESES[mes]} {ano}</span>
              <button onClick={() => mudarMes(1)} disabled={ehMesAtual} className="p-1.5 hover:bg-muted rounded-r-lg disabled:opacity-30" aria-label="Próximo mês"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {carregando || !resumo ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : (
          <>
            {/* Saldo do mês */}
            <div className={cn(
              'rounded-2xl p-5 border',
              resumo.saldo >= 0 ? 'bg-profit/10 border-profit/30' : 'bg-destructive/10 border-destructive/30'
            )}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo do mês</p>
              <p className={cn('text-3xl font-bold mt-1', resumo.saldo >= 0 ? 'text-profit' : 'text-destructive')}>
                {fmtMoeda(resumo.saldo)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {resumo.saldo >= 0 ? 'Você está no lucro este mês.' : 'Atenção: despesas maiores que receitas.'}
              </p>
            </div>

            {/* Receitas x Despesas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-1.5 text-profit text-xs font-medium"><TrendingUp size={14} /> Receitas</div>
                <p className="text-xl font-bold mt-1">{fmtMoeda(resumo.receitas)}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-1.5 text-destructive text-xs font-medium"><TrendingDown size={14} /> Despesas</div>
                <p className="text-xl font-bold mt-1">{fmtMoeda(resumo.despesas)}</p>
              </div>
            </div>

            {/* Gráfico diário */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Movimento diário</p>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-profit" /> Entradas</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Saídas</span>
                </div>
              </div>
              <div className="flex items-end gap-[2px] h-28">
                {resumo.porDia.map(d => (
                  <div key={d.dia} className="flex-1 flex flex-col justify-end gap-[1px] group relative">
                    {d.receitas > 0 && (
                      <div className="w-full bg-profit rounded-sm" style={{ height: `${(d.receitas / maxDia) * 100}%`, minHeight: 2 }} />
                    )}
                    {d.despesas > 0 && (
                      <div className="w-full bg-destructive rounded-sm" style={{ height: `${(d.despesas / maxDia) * 100}%`, minHeight: 2 }} />
                    )}
                    {(d.receitas > 0 || d.despesas > 0) && (
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-popover border border-border rounded-md px-2 py-1 text-[10px] shadow-lg z-10">
                        <p className="font-semibold">Dia {d.dia}</p>
                        {d.receitas > 0 && <p className="text-profit">+{fmtMoeda(d.receitas)}</p>}
                        {d.despesas > 0 && <p className="text-destructive">-{fmtMoeda(d.despesas)}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Botões de ação */}
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => abrirNovo('receita')} className="gap-1.5 bg-profit text-white hover:bg-profit/90">
                <ArrowUpCircle size={16} /> Nova receita
              </Button>
              <Button onClick={() => abrirNovo('despesa')} variant="outline" className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10">
                <ArrowDownCircle size={16} /> Nova despesa
              </Button>
            </div>

            {/* Lista de lançamentos */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Lançamentos ({lista.length})
              </p>
              {lista.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Calendar size={36} className="mb-3 opacity-20" />
                  <p className="text-sm font-medium">Nenhum lançamento em {MESES[mes]}</p>
                  <p className="text-xs mt-1 opacity-60">Adicione uma receita ou despesa acima</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lista.map(l => (
                    <div key={l.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
                      <button
                        onClick={() => abrirEdicao(l)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left rounded-lg hover:bg-accent/50 -m-1 p-1 transition-colors"
                        title="Ver detalhes e editar"
                      >
                        <div className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                          l.tipo === 'receita' ? 'bg-profit/10 text-profit' : 'bg-destructive/10 text-destructive'
                        )}>
                          {l.tipo === 'receita' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{l.descricao || l.categoria}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {l.categoria} · {new Date(l.data).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span className={cn('text-sm font-bold shrink-0', l.tipo === 'receita' ? 'text-profit' : 'text-destructive')}>
                          {l.tipo === 'receita' ? '+' : '-'}{fmtMoeda(l.valor)}
                        </span>
                      </button>
                      <button onClick={() => handleExcluir(l.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0" aria-label="Excluir lançamento">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Formulário de lançamento */}
      <Dialog open={!!form} onOpenChange={v => { if (!v) setForm(null) }}>
        <DialogContent className="w-full max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {form?.id
                ? <><Pencil size={16} className="text-primary" /> Editar lançamento</>
                : form?.tipo === 'receita'
                  ? <><ArrowUpCircle size={18} className="text-profit" /> Nova receita</>
                  : <><ArrowDownCircle size={18} className="text-destructive" /> Nova despesa</>}
            </DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              {/* Seletor de tipo — permite corrigir receita/despesa ao editar */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm(p => p && { ...p, tipo: 'receita', categoria: CATEGORIAS_RECEITA.includes(p.categoria ?? '') ? p.categoria : 'Serviço' })}
                  className={cn(
                    'flex items-center justify-center gap-1.5 h-10 rounded-lg border text-sm font-medium transition-colors',
                    form.tipo === 'receita' ? 'border-profit bg-profit/10 text-profit' : 'border-border text-muted-foreground hover:bg-accent'
                  )}
                >
                  <ArrowUpCircle size={15} /> Receita
                </button>
                <button
                  type="button"
                  onClick={() => setForm(p => p && { ...p, tipo: 'despesa', categoria: CATEGORIAS_DESPESA.includes(p.categoria ?? '') ? p.categoria : 'Material' })}
                  className={cn(
                    'flex items-center justify-center gap-1.5 h-10 rounded-lg border text-sm font-medium transition-colors',
                    form.tipo === 'despesa' ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border text-muted-foreground hover:bg-accent'
                  )}
                >
                  <ArrowDownCircle size={15} /> Despesa
                </button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor (R$) *</Label>
                <Input
                  value={valorReais}
                  onChange={e => setValorReais(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="h-11 text-lg font-semibold"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm(p => p && { ...p, categoria: v ?? 'Outros' })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(form.tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descrição</Label>
                <Input value={form.descricao ?? ''} onChange={e => setForm(p => p && { ...p, descricao: e.target.value })} className="h-10" placeholder="Ex: Instalação split 12k — João" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data</Label>
                <Input type="date" value={form.data ?? hojeISO()} onChange={e => setForm(p => p && { ...p, data: e.target.value })} className="h-10" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2 sm:justify-between">
            {form?.id ? (
              <Button
                variant="outline"
                onClick={async () => { const id = form.id!; setForm(null); await handleExcluir(id) }}
                className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={14} /> Excluir
              </Button>
            ) : <span className="hidden sm:block" />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setForm(null)} className="gap-1.5"><X size={14} /> Cancelar</Button>
              <Button onClick={handleSalvar} disabled={salvando} className="gap-1.5">
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
