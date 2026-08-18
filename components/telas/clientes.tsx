'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users, Search, Plus, Phone, MessageCircle, MapPin, Pencil, Trash2, X, Save,
  Wind, CalendarClock, FileText, Loader2, ChevronRight, AirVent, HandCoins, CircleCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { carregarPerfil } from '@/lib/storage'
import {
  listarClientes, obterCliente, salvarCliente, excluirCliente,
  salvarAparelho, excluirAparelho,
  type ClienteInput,
} from '@/lib/actions/clientes'
import {
  linkTelefone, linkWhatsApp, temWhatsAppValido, formatarTelefone,
} from '@/lib/telefone'
import { receberOrcamento } from '@/lib/actions/financeiro'

// Tipos derivados do retorno das actions
type ClienteResumo = Awaited<ReturnType<typeof listarClientes>>[number]
type FichaCliente = NonNullable<Awaited<ReturnType<typeof obterCliente>>>
type Aparelho = FichaCliente['aparelhos'][number]

// Tipo do formulário de aparelho: datas sempre string ('' = vazio) para o <input type="date">
type FormAparelho = {
  id?: string
  clienteId: string
  tipo: string
  marca: string
  modelo: string
  btu: number
  tensao: string
  gas: string
  ambiente: string
  dataInstalacao: string
  intervaloLimpezaMeses: number
  ultimaLimpeza: string
  observacoes: string
}
const APARELHO_VAZIO = (clienteId: string): FormAparelho => ({
  clienteId, tipo: 'Split', marca: '', modelo: '', btu: 9000, tensao: '', gas: '',
  ambiente: '', dataInstalacao: '', intervaloLimpezaMeses: 6, ultimaLimpeza: '', observacoes: '',
})

const TIPOS_APARELHO = ['Split', 'Split Inverter', 'Janela', 'Cassete', 'Piso-teto', 'Multi-split']
const INTERVALOS = [
  { v: 3, label: 'A cada 3 meses' },
  { v: 6, label: 'A cada 6 meses' },
  { v: 12, label: 'A cada 12 meses' },
]

function fmtData(iso: string | Date | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}
function fmtMoeda(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
// Classifica a proximidade da manutenção para colorir o alerta
function statusManutencao(proxima: Date | string | null): { label: string; cls: string } | null {
  if (!proxima) return null
  const dias = Math.ceil((new Date(proxima).getTime() - Date.now()) / 86400000)
  if (dias < 0) return { label: `Atrasada ${Math.abs(dias)}d`, cls: 'border-destructive/40 text-destructive bg-destructive/10' }
  if (dias <= 30) return { label: `Em ${dias}d`, cls: 'border-cost/40 text-cost bg-cost/10' }
  return { label: fmtData(proxima), cls: 'border-profit/40 text-profit bg-profit/10' }
}

export function Clientes({ ativo, onEditarOrcamento }: { ativo?: boolean; onEditarOrcamento?: (id: string) => void }) {
  const [lista, setLista] = useState<ClienteResumo[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [empresa, setEmpresa] = useState('')

  // Ficha aberta
  const [ficha, setFicha] = useState<FichaCliente | null>(null)
  const [carregandoFicha, setCarregandoFicha] = useState(false)

  // Formulário de cliente (novo/editar)
  const [formCliente, setFormCliente] = useState<ClienteInput | null>(null)
  const [salvandoCliente, setSalvandoCliente] = useState(false)

  // Formulário de aparelho
  const [formAparelho, setFormAparelho] = useState<FormAparelho | null>(null)
  const [salvandoAparelho, setSalvandoAparelho] = useState(false)

  // Modal de recebimento de orçamento (lança receita no fluxo de caixa)
  const [receber, setReceber] = useState<{ id: string; total: number } | null>(null)
  const [valorReceber, setValorReceber] = useState('')
  const [dataReceber, setDataReceber] = useState(new Date().toISOString().slice(0, 10))
  const [recebendo, setRecebendo] = useState(false)

  const abrirRecebimento = (o: { id: string; totalVenda: number }) => {
    setReceber({ id: o.id, total: o.totalVenda })
    setValorReceber((o.totalVenda / 100).toString())
    setDataReceber(new Date().toISOString().slice(0, 10))
  }

  const handleReceber = async () => {
    if (!receber) return
    const centavos = valorReceber ? Math.round(parseFloat(valorReceber.replace(',', '.')) * 100) : receber.total
    if (!centavos || centavos <= 0) { alert('Informe um valor.'); return }
    setRecebendo(true)
    try {
      const res = await receberOrcamento(receber.id, centavos, dataReceber)
      if (!res.ok) { alert(res.mensagem); return }
      setReceber(null)
      if (ficha) await abrirFicha(ficha.cliente.id) // atualiza o selo "Recebido"
    } finally { setRecebendo(false) }
  }

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try { setLista(await listarClientes()) } finally { setCarregando(false) }
  }, [])

  useEffect(() => { if (ativo !== false) recarregar() }, [ativo, recarregar])
  useEffect(() => {
    const p = carregarPerfil()
    setEmpresa(p.empresa || p.nome || '')
  }, [])

  const abrirFicha = async (id: string) => {
    setCarregandoFicha(true)
    try { setFicha(await obterCliente(id)) } finally { setCarregandoFicha(false) }
  }

  const filtrados = lista.filter(c => {
    const q = busca.toLowerCase()
    return c.nome.toLowerCase().includes(q) || c.telefone.includes(busca) || c.cidade.toLowerCase().includes(q)
  })

  // Mensagem padrão de WhatsApp
  const msgWhats = (nome: string) => {
    const saud = empresa ? `Olá ${nome}, aqui é da ${empresa}.` : `Olá ${nome}!`
    return `${saud} Tudo bem? Estou entrando em contato sobre a manutenção do seu ar-condicionado.`
  }

  const handleSalvarCliente = async () => {
    if (!formCliente) return
    setSalvandoCliente(true)
    try {
      const res = await salvarCliente(formCliente)
      if (!res.ok) { alert(res.mensagem); return }
      setFormCliente(null)
      await recarregar()
      // Se estava editando a ficha aberta, atualiza
      if (ficha && formCliente.id === ficha.cliente.id) await abrirFicha(ficha.cliente.id)
    } finally { setSalvandoCliente(false) }
  }

  const handleExcluirCliente = async (id: string, nome: string) => {
    if (!window.confirm(`Excluir ${nome}? Os aparelhos serão removidos e os orçamentos desvinculados.`)) return
    await excluirCliente(id)
    setFicha(null)
    await recarregar()
  }

  const handleSalvarAparelho = async () => {
    if (!formAparelho) return
    setSalvandoAparelho(true)
    try {
      const res = await salvarAparelho(formAparelho)
      if (!res.ok) { alert(res.mensagem); return }
      setFormAparelho(null)
      if (ficha) await abrirFicha(ficha.cliente.id)
      await recarregar()
    } finally { setSalvandoAparelho(false) }
  }

  const handleExcluirAparelho = async (id: string) => {
    if (!window.confirm('Remover este aparelho?')) return
    await excluirAparelho(id)
    if (ficha) await abrirFicha(ficha.cliente.id)
    await recarregar()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Users size={18} className="text-primary" /> Clientes
              </h1>
              <p className="text-xs text-muted-foreground">{lista.length} cadastrado{lista.length !== 1 ? 's' : ''}</p>
            </div>
            <Button
              size="sm"
              className="gap-1.5 h-9"
              onClick={() => setFormCliente({ nome: '', telefone: '', endereco: '', bairro: '', cidade: '', email: '', telefone2: '', observacoes: '' })}
            >
              <Plus size={15} /> Novo
            </Button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, telefone ou cidade..."
              className="pl-8 h-10 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-2.5">
        {carregando ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Users size={40} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhum cliente encontrado</p>
            <p className="text-xs mt-1 opacity-60">{busca ? 'Tente outra busca' : 'Cadastre seu primeiro cliente'}</p>
          </div>
        ) : (
          filtrados.map(c => (
            <div key={c.id} className="rounded-2xl bg-card border border-border hover:border-primary/40 transition-all overflow-hidden">
              <div className="flex items-stretch">
                <button onClick={() => abrirFicha(c.id)} className="flex-1 text-left p-4 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold truncate">{c.nome}</p>
                    <ChevronRight size={14} className="text-muted-foreground/50 shrink-0" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {c.telefone && <span className="flex items-center gap-1"><Phone size={11} /> {formatarTelefone(c.telefone)}</span>}
                    {c.cidade && <span className="flex items-center gap-1"><MapPin size={11} /> {c.cidade}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px] border-border gap-1"><AirVent size={10} /> {c.qtdAparelhos} aparelho{c.qtdAparelhos !== 1 ? 's' : ''}</Badge>
                    <Badge variant="outline" className="text-[10px] border-border gap-1"><FileText size={10} /> {c.qtdOrcamentos} orçamento{c.qtdOrcamentos !== 1 ? 's' : ''}</Badge>
                  </div>
                </button>
                {/* Ações rápidas: Ligar / WhatsApp */}
                <div className="flex flex-col border-l border-border">
                  <a
                    href={linkTelefone(c.telefone) || undefined}
                    className={cn('flex-1 flex items-center justify-center px-4 hover:bg-primary/10 transition-colors', !c.telefone && 'opacity-30 pointer-events-none')}
                    aria-label={`Ligar para ${c.nome}`}
                  >
                    <Phone size={17} className="text-primary" />
                  </a>
                  <a
                    href={temWhatsAppValido(c.telefone) ? linkWhatsApp(c.telefone, msgWhats(c.nome)) : undefined}
                    target="_blank" rel="noopener noreferrer"
                    className={cn('flex-1 flex items-center justify-center px-4 border-t border-border hover:bg-profit/10 transition-colors', !temWhatsAppValido(c.telefone) && 'opacity-30 pointer-events-none')}
                    aria-label={`WhatsApp de ${c.nome}`}
                  >
                    <MessageCircle size={17} className="text-profit" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Ficha do cliente ─────────────────────────────────────────────── */}
      <Dialog open={!!ficha} onOpenChange={v => { if (!v) setFicha(null) }}>
        <DialogContent className="w-full max-w-xl max-h-[92dvh] overflow-y-auto p-0 gap-0 rounded-2xl">
          {carregandoFicha || !ficha ? (
            <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary" size={28} /></div>
          ) : (
            <>
              <DialogHeader className="px-5 pt-5 pb-0">
                <DialogTitle className="text-lg font-bold pr-8">{ficha.cliente.nome}</DialogTitle>
              </DialogHeader>

              <div className="px-5 pb-5 mt-3 space-y-5">
                {/* Contato rápido */}
                <div className="flex gap-2">
                  <a
                    href={linkTelefone(ficha.cliente.telefone) || undefined}
                    className={cn('flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors', !ficha.cliente.telefone && 'opacity-40 pointer-events-none')}
                  >
                    <Phone size={16} /> Ligar
                  </a>
                  <a
                    href={temWhatsAppValido(ficha.cliente.telefone) ? linkWhatsApp(ficha.cliente.telefone, msgWhats(ficha.cliente.nome)) : undefined}
                    target="_blank" rel="noopener noreferrer"
                    className={cn('flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-profit/10 text-profit font-semibold text-sm hover:bg-profit/20 transition-colors', !temWhatsAppValido(ficha.cliente.telefone) && 'opacity-40 pointer-events-none')}
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </a>
                </div>

                {/* Dados */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados</p>
                    <div className="flex gap-1">
                      <button onClick={() => setFormCliente({ id: ficha.cliente.id, nome: ficha.cliente.nome, telefone: ficha.cliente.telefone, telefone2: ficha.cliente.telefone2, email: ficha.cliente.email, endereco: ficha.cliente.endereco, bairro: ficha.cliente.bairro, cidade: ficha.cliente.cidade, observacoes: ficha.cliente.observacoes })} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" aria-label="Editar cliente"><Pencil size={13} /></button>
                      <button onClick={() => handleExcluirCliente(ficha.cliente.id, ficha.cliente.nome)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive" aria-label="Excluir cliente"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {ficha.cliente.telefone && <span className="text-muted-foreground">Telefone: <span className="text-foreground font-medium">{formatarTelefone(ficha.cliente.telefone)}</span></span>}
                    {ficha.cliente.telefone2 && <span className="text-muted-foreground">Telefone 2: <span className="text-foreground font-medium">{formatarTelefone(ficha.cliente.telefone2)}</span></span>}
                    {ficha.cliente.email && <span className="text-muted-foreground col-span-2">E-mail: <span className="text-foreground font-medium">{ficha.cliente.email}</span></span>}
                    {ficha.cliente.endereco && <span className="text-muted-foreground col-span-2">Endereço: <span className="text-foreground font-medium">{ficha.cliente.endereco}</span></span>}
                    {(ficha.cliente.bairro || ficha.cliente.cidade) && <span className="text-muted-foreground col-span-2">{[ficha.cliente.bairro, ficha.cliente.cidade].filter(Boolean).join(', ')}</span>}
                    {ficha.cliente.observacoes && <span className="text-muted-foreground col-span-2 mt-1">Obs.: <span className="text-foreground">{ficha.cliente.observacoes}</span></span>}
                  </div>
                </div>

                {/* Aparelhos */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aparelhos</p>
                    <button onClick={() => setFormAparelho(APARELHO_VAZIO(ficha.cliente.id))} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"><Plus size={13} /> Adicionar</button>
                  </div>
                  <div className="p-3 space-y-2">
                    {ficha.aparelhos.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhum aparelho cadastrado.</p>
                    ) : ficha.aparelhos.map((ap: Aparelho) => {
                      const st = statusManutencao(ap.proximaManutencao)
                      return (
                        <div key={ap.id} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold flex items-center gap-1.5"><Wind size={13} className="text-primary shrink-0" /> {ap.tipo}{ap.marca ? ` · ${ap.marca}` : ''}{ap.btu ? ` · ${(ap.btu / 1000).toFixed(0)}K BTU` : ''}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{[ap.ambiente, ap.tensao, ap.gas].filter(Boolean).join(' · ') || 'Sem detalhes'}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => setFormAparelho({ id: ap.id, clienteId: ficha.cliente.id, tipo: ap.tipo ?? 'Split', marca: ap.marca ?? '', modelo: ap.modelo ?? '', btu: ap.btu ?? 0, tensao: ap.tensao ?? '', gas: ap.gas ?? '', ambiente: ap.ambiente ?? '', intervaloLimpezaMeses: ap.intervaloLimpezaMeses ?? 6, dataInstalacao: ap.dataInstalacao ? new Date(ap.dataInstalacao).toISOString().slice(0, 10) : '', ultimaLimpeza: ap.ultimaLimpeza ? new Date(ap.ultimaLimpeza).toISOString().slice(0, 10) : '', observacoes: ap.observacoes ?? '' })} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" aria-label="Editar aparelho"><Pencil size={12} /></button>
                              <button onClick={() => handleExcluirAparelho(ap.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive" aria-label="Remover aparelho"><Trash2 size={12} /></button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {st && <Badge variant="outline" className={cn('text-[10px] gap-1', st.cls)}><CalendarClock size={10} /> Manutenção: {st.label}</Badge>}
                            <span className="text-[10px] text-muted-foreground">Última limpeza: {fmtData(ap.ultimaLimpeza)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Orçamentos vinculados */}
                {ficha.orcamentos.length > 0 && (
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Orçamentos ({ficha.orcamentos.length})</p>
                    </div>
                    <div className="divide-y divide-border">
                      {ficha.orcamentos.map(o => (
                        <div key={o.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                          <button
                            onClick={() => { setFicha(null); onEditarOrcamento?.(o.id) }}
                            className="flex items-center justify-between gap-2 flex-1 min-w-0 text-left rounded-md px-1.5 py-1 hover:bg-accent transition-colors"
                            title="Abrir para editar"
                          >
                            <span className="text-muted-foreground truncate">
                              {fmtData(o.createdAt)} · <span className="capitalize">{o.status}</span>
                            </span>
                            <span className="font-semibold text-sale shrink-0">{fmtMoeda(o.totalVenda)}</span>
                            <Pencil size={12} className="text-muted-foreground shrink-0" />
                          </button>
                          {o.recebido ? (
                            <Badge variant="outline" className="text-[10px] border-profit/40 text-profit bg-profit/10 shrink-0 gap-1">
                              <CircleCheck size={11} /> Recebido
                            </Badge>
                          ) : (
                            <button
                              onClick={() => abrirRecebimento(o)}
                              className="flex items-center gap-1 rounded-md border border-profit/40 text-profit hover:bg-profit/10 px-2 py-1 shrink-0 font-medium transition-colors"
                              title="Registrar recebimento no fluxo de caixa"
                            >
                              <HandCoins size={12} /> Receber
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Formulário de cliente ────────────────────────────────────────── */}
      <Dialog open={!!formCliente} onOpenChange={v => { if (!v) setFormCliente(null) }}>
        <DialogContent className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{formCliente?.id ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
          </DialogHeader>
          {formCliente && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input value={formCliente.nome} onChange={e => setFormCliente({ ...formCliente!, nome: e.target.value })} className="h-10" placeholder="Nome do cliente" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Telefone (WhatsApp)</Label>
                  <Input value={formCliente.telefone ?? ''} onChange={e => setFormCliente({ ...formCliente!, telefone: e.target.value })} className="h-10" placeholder="(11) 91234-5678" inputMode="tel" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Telefone 2</Label>
                  <Input value={formCliente.telefone2 ?? ''} onChange={e => setFormCliente({ ...formCliente!, telefone2: e.target.value })} className="h-10" inputMode="tel" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">E-mail</Label>
                <Input value={formCliente.email ?? ''} onChange={e => setFormCliente({ ...formCliente!, email: e.target.value })} className="h-10" inputMode="email" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Endereço</Label>
                <Input value={formCliente.endereco ?? ''} onChange={e => setFormCliente({ ...formCliente!, endereco: e.target.value })} className="h-10" placeholder="Rua, número" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Bairro</Label>
                  <Input value={formCliente.bairro ?? ''} onChange={e => setFormCliente({ ...formCliente!, bairro: e.target.value })} className="h-10" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cidade</Label>
                  <Input value={formCliente.cidade ?? ''} onChange={e => setFormCliente({ ...formCliente!, cidade: e.target.value })} className="h-10" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Textarea value={formCliente.observacoes ?? ''} onChange={e => setFormCliente({ ...formCliente!, observacoes: e.target.value })} className="text-sm min-h-[60px]" placeholder="Anotações sobre o cliente" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setFormCliente(null)} className="gap-1.5"><X size={14} /> Cancelar</Button>
            <Button onClick={handleSalvarCliente} disabled={salvandoCliente} className="gap-1.5">
              {salvandoCliente ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Formulário de aparelho ───────────────────────────────────────── */}
      <Dialog open={!!formAparelho} onOpenChange={v => { if (!v) setFormAparelho(null) }}>
        <DialogContent className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{formAparelho?.id ? 'Editar aparelho' : 'Novo aparelho'}</DialogTitle>
          </DialogHeader>
          {formAparelho && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={formAparelho.tipo} onValueChange={v => setFormAparelho(p => p && { ...p, tipo: v ?? 'Split' })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS_APARELHO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">BTU</Label>
                  <Input type="number" value={formAparelho.btu ?? 0} onChange={e => setFormAparelho(p => p && { ...p, btu: Number(e.target.value) })} className="h-10" placeholder="9000" inputMode="numeric" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Marca</Label>
                  <Input value={formAparelho.marca ?? ''} onChange={e => setFormAparelho(p => p && { ...p, marca: e.target.value })} className="h-10" placeholder="LG, Samsung..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ambiente</Label>
                  <Input value={formAparelho.ambiente ?? ''} onChange={e => setFormAparelho(p => p && { ...p, ambiente: e.target.value })} className="h-10" placeholder="Sala, Quarto..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tensão</Label>
                  <Input value={formAparelho.tensao ?? ''} onChange={e => setFormAparelho(p => p && { ...p, tensao: e.target.value })} className="h-10" placeholder="220V" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Gás</Label>
                  <Input value={formAparelho.gas ?? ''} onChange={e => setFormAparelho(p => p && { ...p, gas: e.target.value })} className="h-10" placeholder="R410A, R32..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Instalação</Label>
                  <Input type="date" value={formAparelho.dataInstalacao ?? ''} onChange={e => setFormAparelho(p => p && { ...p, dataInstalacao: e.target.value })} className="h-10" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Última limpeza</Label>
                  <Input type="date" value={formAparelho.ultimaLimpeza ?? ''} onChange={e => setFormAparelho(p => p && { ...p, ultimaLimpeza: e.target.value })} className="h-10" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Intervalo de limpeza</Label>
                <Select value={String(formAparelho.intervaloLimpezaMeses ?? 6)} onValueChange={v => setFormAparelho(p => p && { ...p, intervaloLimpezaMeses: Number(v) })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{INTERVALOS.map(i => <SelectItem key={i.v} value={String(i.v)}>{i.label}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">A próxima manutenção é calculada a partir da última limpeza (ou instalação) + intervalo.</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setFormAparelho(null)} className="gap-1.5"><X size={14} /> Cancelar</Button>
            <Button onClick={handleSalvarAparelho} disabled={salvandoAparelho} className="gap-1.5">
              {salvandoAparelho ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal de recebimento (vincula ao fluxo de caixa) ─────────────── */}
      <Dialog open={!!receber} onOpenChange={v => { if (!v) setReceber(null) }}>
        <DialogContent className="w-full max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><HandCoins size={18} className="text-profit" /> Registrar recebimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Valor recebido (R$)</Label>
              <Input value={valorReceber} onChange={e => setValorReceber(e.target.value)} className="h-11 text-lg font-semibold" placeholder="0,00" inputMode="decimal" autoFocus />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data do recebimento</Label>
              <Input type="date" value={dataReceber} onChange={e => setDataReceber(e.target.value)} className="h-10" />
            </div>
            <p className="text-[11px] text-muted-foreground">Entra como receita no fluxo de caixa e marca o orçamento como aprovado.</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setReceber(null)} className="gap-1.5"><X size={14} /> Cancelar</Button>
            <Button onClick={handleReceber} disabled={recebendo} className="gap-1.5 bg-profit text-white hover:bg-profit/90">
              {recebendo ? <Loader2 size={14} className="animate-spin" /> : <HandCoins size={14} />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
