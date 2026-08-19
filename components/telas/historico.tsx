'use client'

import { useEffect, useState } from 'react'
import {
  Trash2, Eye, CheckCircle, XCircle, Send,
  FileText, Search, Download, Pencil, Save,
  Users, Lock, ChevronDown, X, Bot, ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  carregarOrcamentos,
  excluirOrcamento,
  atualizarStatusOrcamento,
  salvarOrcamento,
  carregarPerfil,
} from '@/lib/storage'
import type { Orcamento } from '@/lib/tipos'
import { MAX_ORCAMENTOS } from '@/lib/tipos'
import { gerarHtmlPdf, type VersaoPdf } from '@/lib/gerar-pdf'
import { Separator } from '@/components/ui/separator'

const STATUS_LABEL: Record<Orcamento['status'], string> = {
  rascunho: 'Rascunho',
  enviado:  'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
}
const STATUS_COLOR: Record<Orcamento['status'], string> = {
  rascunho: 'border-muted-foreground/30 text-muted-foreground',
  enviado:  'border-cost/40 text-cost',
  aprovado: 'border-profit/40 text-profit',
  recusado: 'border-destructive/40 text-destructive',
}
const STATUS_BG: Record<Orcamento['status'], string> = {
  rascunho: 'bg-muted/40',
  enviado:  'bg-cost/10',
  aprovado: 'bg-profit/10',
  recusado: 'bg-destructive/10',
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}


interface HistoricoProps {
  ativo?: boolean
  onEditarNoChat?: (orc: Orcamento) => void
  abrirId?: string | null
  abrirNonce?: number
}

export function Historico({ ativo, onEditarNoChat, abrirId, abrirNonce }: HistoricoProps) {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<Orcamento['status'] | 'todos'>('todos')
  const [selecionado, setSelecionado] = useState<Orcamento | null>(null)
  const [editando, setEditando] = useState(false)
  const [edicao, setEdicao] = useState<Partial<Orcamento>>({})
  const [versaoPdf, setVersaoPdf] = useState<VersaoPdf>('cliente')

  const recarregar = () => setOrcamentos(carregarOrcamentos())
  // Recarrega ao montar e sempre que a aba volta a ficar ativa
  useEffect(() => { if (ativo !== false) recarregar() }, [ativo])

  // Abre direto o orçamento clicado no dashboard (recentes)
  useEffect(() => {
    if (!abrirNonce || !abrirId) return
    const lista = carregarOrcamentos()
    const alvo = lista.find(o => o.id === abrirId)
    if (alvo) {
      setOrcamentos(lista)
      setSelecionado(alvo)
      setEditando(false)
    }
  }, [abrirNonce, abrirId])

  const filtrados = orcamentos.filter(o => {
    const matchBusca =
      o.numero.toLowerCase().includes(busca.toLowerCase()) ||
      o.clienteNome.toLowerCase().includes(busca.toLowerCase())
    const matchStatus = filtroStatus === 'todos' || o.status === filtroStatus
    return matchBusca && matchStatus
  })

  const handleExcluir = (id: string) => {
    excluirOrcamento(id)
    if (selecionado?.id === id) setSelecionado(null)
    recarregar()
  }

  const handleStatus = (id: string, status: Orcamento['status']) => {
    atualizarStatusOrcamento(id, status)
    recarregar()
    setSelecionado(prev => prev?.id === id ? { ...prev, status } : prev)
  }

  const abrirEdicao = () => {
    if (!selecionado) return
    setEdicao({
      numero: selecionado.numero,
      clienteNome: selecionado.clienteNome,
      clienteTelefone: selecionado.clienteTelefone,
      clienteEmail: selecionado.clienteEmail,
      clienteEndereco: selecionado.clienteEndereco,
      observacoes: selecionado.observacoes,
    })
    setEditando(true)
  }

  const salvarEdicao = () => {
    if (!selecionado) return
    const atualizado = { ...selecionado, ...edicao }
    salvarOrcamento(atualizado)
    setSelecionado(atualizado)
    setEditando(false)
    recarregar()
  }

  const exportar = (orc: Orcamento, versao: VersaoPdf) => {
    const perfil = carregarPerfil()
    const html = gerarHtmlPdf(orc, perfil, versao)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    // Nome do arquivo sugerido no "Salvar como PDF" = nº do orçamento + cliente
    setTimeout(() => { try { win.document.title = `Orcamento ${orc.numero}${orc.clienteNome ? ' - ' + orc.clienteNome : ''}` } catch {} win.print() }, 600)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold">Histórico</h1>
              <p className="text-xs text-muted-foreground">
                {orcamentos.length}/{MAX_ORCAMENTOS} orçamentos
              </p>
            </div>
            {/* Barra de uso compacta */}
            <div className="w-24">
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all',
                    orcamentos.length >= MAX_ORCAMENTOS ? 'bg-destructive' :
                    orcamentos.length >= MAX_ORCAMENTOS * 0.8 ? 'bg-cost' : 'bg-primary'
                  )}
                  style={{ width: `${(orcamentos.length / MAX_ORCAMENTOS) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Busca + filtro */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar cliente ou número..."
                className="pl-8 h-10 text-sm"
              />
            </div>
            <Select value={filtroStatus} onValueChange={v => setFiltroStatus(v as Orcamento['status'] | 'todos')}>
              <SelectTrigger className="h-10 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">Todos</SelectItem>
                {(Object.keys(STATUS_LABEL) as Orcamento['status'][]).map(s => (
                  <SelectItem key={s} value={s} className="text-xs">{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <FileText size={40} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhum orçamento encontrado</p>
            <p className="text-xs mt-1 opacity-60">
              {busca ? 'Tente outra busca' : 'Crie seu primeiro orçamento'}
            </p>
          </div>
        ) : (
          filtrados.map(o => (
            <div key={o.id} className="relative">
            <button
              onClick={() => { setSelecionado(o); setEditando(false) }}
              className="w-full text-left p-4 rounded-2xl bg-card border border-border hover:border-primary/40 active:scale-[0.99] transition-all"
            >
              {/* Linha superior */}
              <div className="flex items-start justify-between gap-2 mb-3 pr-10">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold">{o.numero}</p>
                    <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLOR[o.status], STATUS_BG[o.status])}>
                      {STATUS_LABEL[o.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtData(o.dataCriacao)}</p>
                </div>
              </div>

              {/* Cliente */}
              <p className="text-sm font-medium mb-1 truncate">
                {o.clienteNome || 'Cliente não informado'}
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                {o.equipamentos.length} equipamento{o.equipamentos.length !== 1 ? 's' : ''}
                {o.equipamentos.length > 0 && (
                  <> · {o.equipamentos.map(e => `${(e.btu/1000).toFixed(0)}K`).join(', ')} BTU</>
                )}
              </p>

              {/* Valores */}
              <div className="flex items-center gap-3">
                <div className="flex-1 p-2 rounded-xl bg-muted/40 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Venda</p>
                  <p className="text-sm font-bold text-sale">{fmt(o.totalVenda)}</p>
                </div>
                <div className="flex-1 p-2 rounded-xl bg-profit/5 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Lucro</p>
                  <p className="text-sm font-bold text-profit">{fmt(o.lucro)}</p>
                </div>
                <div className="flex-1 p-2 rounded-xl bg-muted/40 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Margem</p>
                  <p className="text-sm font-bold text-profit">{o.margemLucro.toFixed(0)}%</p>
                </div>
              </div>
            </button>

            {/* Apagar — canto superior direito, com confirma��ão */}
            <button
              onClick={() => {
                if (window.confirm(`Apagar o orçamento ${o.numero}? Esta ação não pode ser desfeita.`)) {
                  handleExcluir(o.id)
                }
              }}
              className="absolute top-3 right-3 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label={`Apagar orçamento ${o.numero}`}
            >
              <Trash2 size={16} />
            </button>
            </div>
          ))
        )}
      </div>

      {/* Modal detalhes + edição */}
      <Dialog open={!!selecionado} onOpenChange={v => { if (!v) { setSelecionado(null); setEditando(false) } }}>
        <DialogContent className="w-full max-w-xl max-h-[92dvh] overflow-y-auto p-0 gap-0 rounded-2xl">
          {selecionado && (
            <>
              <DialogHeader className="px-5 pt-5 pb-0">
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => { setSelecionado(null); setEditando(false) }}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mr-1"
                  >
                    <ArrowLeft size={15} /> Voltar
                  </button>
                  <span className="text-muted-foreground/40">|</span>
                  {editando ? (
                    <Input
                      value={edicao.numero ?? ''}
                      onChange={e => setEdicao(p => ({ ...p, numero: e.target.value }))}
                      className="h-8 text-base font-bold w-40"
                    />
                  ) : (
                    <span className="text-base font-bold">{selecionado.numero}</span>
                  )}
                  <Badge variant="outline" className={cn('text-[10px]', STATUS_COLOR[selecionado.status])}>
                    {STATUS_LABEL[selecionado.status]}
                  </Badge>
                  <div className="flex-1" />
                  {!editando ? (
                    <div className="flex gap-1.5">
                      {onEditarNoChat && (
                        <Button
                          size="sm"
                          className="gap-1.5 h-8 text-xs"
                          onClick={() => { onEditarNoChat(selecionado); setSelecionado(null) }}
                        >
                          <Bot size={11} /> Editar no chat
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={abrirEdicao}>
                        <Pencil size={11} /> Dados
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={salvarEdicao}>
                        <Save size={11} /> Salvar
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditando(false)}>
                        <X size={11} />
                      </Button>
                    </div>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="px-5 pb-5 mt-4 space-y-5">

                {/* Dados do cliente */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</p>
                  </div>
                  <div className="p-4">
                    {editando ? (
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase">Nome</Label>
                          <Input value={edicao.clienteNome ?? ''} onChange={e => setEdicao(p => ({ ...p, clienteNome: e.target.value }))} className="h-9 text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground uppercase">Telefone</Label>
                            <Input value={edicao.clienteTelefone ?? ''} onChange={e => setEdicao(p => ({ ...p, clienteTelefone: e.target.value }))} className="h-9 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground uppercase">E-mail</Label>
                            <Input value={edicao.clienteEmail ?? ''} onChange={e => setEdicao(p => ({ ...p, clienteEmail: e.target.value }))} className="h-9 text-sm" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase">Endereço</Label>
                          <Input value={edicao.clienteEndereco ?? ''} onChange={e => setEdicao(p => ({ ...p, clienteEndereco: e.target.value }))} className="h-9 text-sm" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-semibold text-sm">{selecionado.clienteNome || '—'}</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {selecionado.clienteTelefone && <span>{selecionado.clienteTelefone}</span>}
                          {selecionado.clienteEmail && <span>{selecionado.clienteEmail}</span>}
                          {selecionado.clienteEndereco && <span className="col-span-2">{selecionado.clienteEndereco}</span>}
                          <span>Emitido: {fmtData(selecionado.dataCriacao)}</span>
                          <span>Válido até: {fmtData(selecionado.validade)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Equipamentos */}
                {selecionado.equipamentos.length > 0 && (
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Equipamentos</p>
                    </div>
                    <div className="p-4 space-y-3">
                      {selecionado.equipamentos.map(eq => (
                        <div key={eq.id} className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                          <p className="text-sm font-semibold">
                            {eq.marca} {eq.tipo} — {(eq.btu / 1000).toFixed(0)}K BTU × {eq.quantidade}
                          </p>
                          <p className="text-xs text-muted-foreground">{eq.ambiente} · {eq.tensao} · {eq.distanciaTubulacao}m</p>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                            <span>Cabo interl.: <span className="text-foreground font-medium">{eq.caboInterligacao}</span></span>
                            <span>Cabo alim.: <span className="text-foreground font-medium">{eq.caboAlimentacao}</span></span>
                            <span>Disjuntor: <span className="text-foreground font-medium">{eq.disjuntor}</span></span>
                            <span>Tubulação: <span className="text-foreground font-medium">{eq.tubulacaoLiquido}/{eq.tubulacaoSuccao}</span></span>
                          </div>
                          <p className="text-[10px] text-cost">Gás: {eq.cargaGas}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Itens */}
                {selecionado.itens.length > 0 && (
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Itens do Orçamento</p>
                    </div>
                    <div className="divide-y divide-border">
                      {selecionado.itens.map(it => (
                        <div key={it.id} className="flex items-center px-4 py-2.5 gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{it.descricao}</p>
                            <p className="text-[10px] text-muted-foreground">{it.quantidade} {it.unidade}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold text-sale">{fmt(it.precoVenda)}</p>
                            <p className="text-[10px] text-muted-foreground">custo: {fmt(it.precoCusto)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Totais — 4 cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Custo Total</p>
                    <p className="text-base font-bold text-cost">{fmt(selecionado.totalCusto)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-sale/5 border border-sale/20">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Venda Total</p>
                    <p className="text-base font-bold text-sale">{fmt(selecionado.totalVenda)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-profit/5 border border-profit/20">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Lucro</p>
                    <p className="text-base font-bold text-profit">{fmt(selecionado.lucro)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-profit/5 border border-profit/20">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Margem</p>
                    <p className="text-base font-bold text-profit">{selecionado.margemLucro.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Observações */}
                {editando ? (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Observações</Label>
                    <Textarea
                      value={edicao.observacoes ?? ''}
                      onChange={e => setEdicao(p => ({ ...p, observacoes: e.target.value }))}
                      className="text-sm resize-none h-20"
                    />
                  </div>
                ) : selecionado.observacoes ? (
                  <div className="p-3 rounded-xl bg-muted/30 border-l-2 border-primary text-xs text-muted-foreground leading-relaxed">
                    {selecionado.observacoes}
                  </div>
                ) : null}

                <Separator />

                {/* Mudar status */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-medium">Alterar status</p>
                  <div className="flex gap-2 flex-wrap">
                    {(['enviado', 'aprovado', 'recusado'] as Orcamento['status'][]).map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatus(selecionado.id, s)}
                        className={cn(
                          'flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-colors font-medium',
                          STATUS_COLOR[s],
                          selecionado.status === s
                            ? cn(STATUS_BG[s], 'font-bold')
                            : 'hover:bg-muted/40'
                        )}
                      >
                        {s === 'enviado' && <Send size={11} />}
                        {s === 'aprovado' && <CheckCircle size={11} />}
                        {s === 'recusado' && <XCircle size={11} />}
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                    <button
                      onClick={() => handleExcluir(selecionado.id)}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors font-medium ml-auto"
                    >
                      <Trash2 size={11} /> Excluir
                    </button>
                  </div>
                </div>

                {/* Exportar PDF — versão cliente vs interna */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 bg-muted/30 border-b border-border">
                    <p className="text-xs font-semibold uppercase tracking-wide">Exportar PDF</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setVersaoPdf('cliente')}
                        className={cn(
                          'p-3 rounded-xl border-2 text-left transition-all',
                          versaoPdf === 'cliente'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Users size={14} className="text-primary" />
                          <span className="text-xs font-semibold">Para o Cliente</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          Mostra apenas preços de venda. Sem custos ou margens.
                        </p>
                      </button>
                      <button
                        onClick={() => setVersaoPdf('interna')}
                        className={cn(
                          'p-3 rounded-xl border-2 text-left transition-all',
                          versaoPdf === 'interna'
                            ? 'border-cost bg-cost/5'
                            : 'border-border hover:border-cost/40'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Lock size={14} className="text-cost" />
                          <span className="text-xs font-semibold">Versão Interna</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          Inclui custo, venda, lucro e margem por item.
                        </p>
                      </button>
                    </div>
                    <Button
                      className="w-full gap-2 h-12 text-sm font-bold rounded-xl"
                      onClick={() => exportar(selecionado, versaoPdf)}
                    >
                      <Download size={16} />
                      {versaoPdf === 'cliente' ? 'Exportar — Versão Cliente' : 'Exportar — Versão Interna'}
                    </Button>
                  </div>
                </div>

              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


