'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users2, Plus, Phone, Pencil, Trash2, X, Save, Loader2, HandCoins,
  BadgeDollarSign, CalendarClock, MessageCircle, Power,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  listarFuncionarios, salvarFuncionario, excluirFuncionario, pagarSalario,
  type FuncionarioInput,
} from '@/lib/actions/financeiro'
import { linkWhatsApp, temWhatsAppValido } from '@/lib/telefone'

type Funcionario = Awaited<ReturnType<typeof listarFuncionarios>>[number]

const FUNCOES = ['Ajudante', 'Técnico', 'Auxiliar', 'Instalador', 'Administrativo', 'Sócio']

function fmtMoeda(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

const FORM_VAZIO: FuncionarioInput = {
  nome: '', funcao: 'Ajudante', telefone: '', salario: 0, diaPagamento: 5, ativo: true, observacoes: '',
}

export function Funcionarios({ ativo }: { ativo?: boolean }) {
  const [lista, setLista] = useState<Funcionario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState<FuncionarioInput | null>(null)
  const [salarioReais, setSalarioReais] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Modal de pagamento
  const [pagando, setPagando] = useState<Funcionario | null>(null)
  const [valorPagto, setValorPagto] = useState('')
  const [dataPagto, setDataPagto] = useState(hojeISO())
  const [processandoPagto, setProcessandoPagto] = useState(false)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try { setLista(await listarFuncionarios()) } finally { setCarregando(false) }
  }, [])

  useEffect(() => { if (ativo !== false) recarregar() }, [ativo, recarregar])

  const abrirNovo = () => { setForm({ ...FORM_VAZIO }); setSalarioReais('') }
  const abrirEditar = (f: Funcionario) => {
    setForm({
      id: f.id, nome: f.nome, funcao: f.funcao, telefone: f.telefone,
      salario: f.salario, diaPagamento: f.diaPagamento, ativo: f.ativo, observacoes: f.observacoes,
    })
    setSalarioReais(f.salario ? (f.salario / 100).toString() : '')
  }

  const handleSalvar = async () => {
    if (!form) return
    if (!form.nome.trim()) { alert('Informe o nome.'); return }
    const centavos = salarioReais ? Math.round(parseFloat(salarioReais.replace(',', '.')) * 100) : 0
    setSalvando(true)
    try {
      const res = await salvarFuncionario({ ...form, salario: centavos })
      if (!res.ok) { alert(res.mensagem); return }
      setForm(null)
      await recarregar()
    } finally { setSalvando(false) }
  }

  const handleExcluir = async (id: string, nome: string) => {
    if (!window.confirm(`Excluir ${nome}? O histórico de pagamentos permanece no fluxo de caixa.`)) return
    await excluirFuncionario(id)
    await recarregar()
  }

  const abrirPagamento = (f: Funcionario) => {
    setPagando(f)
    setValorPagto(f.salario ? (f.salario / 100).toString() : '')
    setDataPagto(hojeISO())
  }

  const handlePagar = async () => {
    if (!pagando) return
    const centavos = valorPagto ? Math.round(parseFloat(valorPagto.replace(',', '.')) * 100) : pagando.salario
    if (!centavos || centavos <= 0) { alert('Informe um valor.'); return }
    setProcessandoPagto(true)
    try {
      const res = await pagarSalario(pagando.id, centavos, dataPagto)
      if (!res.ok) { alert(res.mensagem); return }
      setPagando(null)
      alert(`Pagamento de ${fmtMoeda(centavos)} lançado no fluxo de caixa.`)
    } finally { setProcessandoPagto(false) }
  }

  const folhaTotal = lista.filter(f => f.ativo).reduce((s, f) => s + f.salario, 0)
  const ativos = lista.filter(f => f.ativo).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Users2 size={18} className="text-primary" /> Funcionários
            </h1>
            <p className="text-xs text-muted-foreground">{ativos} ativo{ativos !== 1 ? 's' : ''} · folha {fmtMoeda(folhaTotal)}/mês</p>
          </div>
          <Button size="sm" className="gap-1.5 h-9" onClick={abrirNovo}>
            <Plus size={15} /> Novo
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {carregando ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Users2 size={40} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhum funcionário cadastrado</p>
            <p className="text-xs mt-1 opacity-60">Adicione seus ajudantes para controlar salários</p>
          </div>
        ) : (
          lista.map(f => (
            <div key={f.id} className={cn('rounded-2xl border bg-card p-4', f.ativo ? 'border-border' : 'border-border/50 opacity-60')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate">{f.nome}</p>
                    <Badge variant="outline" className="text-[10px] border-border">{f.funcao}</Badge>
                    {!f.ativo && <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">Inativo</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1.5">
                    {f.salario > 0 && <span className="flex items-center gap-1"><BadgeDollarSign size={12} /> {fmtMoeda(f.salario)}</span>}
                    {f.diaPagamento > 0 && <span className="flex items-center gap-1"><CalendarClock size={12} /> dia {f.diaPagamento}</span>}
                    {f.telefone && <span className="flex items-center gap-1"><Phone size={11} /> {f.telefone}</span>}
                  </div>
                  {f.observacoes && <p className="text-[11px] text-muted-foreground mt-1.5">{f.observacoes}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {temWhatsAppValido(f.telefone) && (
                    <a href={linkWhatsApp(f.telefone, `Olá ${f.nome}!`)} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md hover:bg-profit/10 text-muted-foreground hover:text-profit" aria-label={`WhatsApp de ${f.nome}`}><MessageCircle size={14} /></a>
                  )}
                  <button onClick={() => abrirEditar(f)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" aria-label="Editar"><Pencil size={14} /></button>
                  <button onClick={() => handleExcluir(f.id, f.nome)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive" aria-label="Excluir"><Trash2 size={14} /></button>
                </div>
              </div>
              {f.ativo && (
                <Button onClick={() => abrirPagamento(f)} size="sm" variant="outline" className="w-full mt-3 gap-1.5 border-profit/40 text-profit hover:bg-profit/10">
                  <HandCoins size={15} /> Registrar pagamento
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Formulário de funcionário */}
      <Dialog open={!!form} onOpenChange={v => { if (!v) setForm(null) }}>
        <DialogContent className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Editar funcionário' : 'Novo funcionário'}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input value={form.nome} onChange={e => setForm(p => p && { ...p, nome: e.target.value })} className="h-10" placeholder="Nome do ajudante" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Função</Label>
                  <Select value={form.funcao} onValueChange={v => setForm(p => p && { ...p, funcao: v ?? 'Ajudante' })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>{FUNCOES.map(fn => <SelectItem key={fn} value={fn}>{fn}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Telefone</Label>
                  <Input value={form.telefone ?? ''} onChange={e => setForm(p => p && { ...p, telefone: e.target.value })} className="h-10" placeholder="(11) 91234-5678" inputMode="tel" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Salário mensal (R$)</Label>
                  <Input value={salarioReais} onChange={e => setSalarioReais(e.target.value)} className="h-10" placeholder="1500,00" inputMode="decimal" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dia de pagamento</Label>
                  <Input type="number" min={0} max={31} value={form.diaPagamento ?? 5} onChange={e => setForm(p => p && { ...p, diaPagamento: Number(e.target.value) })} className="h-10" inputMode="numeric" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  <Power size={15} className="text-muted-foreground" />
                  <Label className="text-sm">Funcionário ativo</Label>
                </div>
                <Switch checked={form.ativo ?? true} onCheckedChange={v => setForm(p => p && { ...p, ativo: v })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Textarea value={form.observacoes ?? ''} onChange={e => setForm(p => p && { ...p, observacoes: e.target.value })} className="text-sm min-h-[56px]" placeholder="Anotações (chave PIX, contrato, etc.)" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setForm(null)} className="gap-1.5"><X size={14} /> Cancelar</Button>
            <Button onClick={handleSalvar} disabled={salvando} className="gap-1.5">
              {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de pagamento de salário */}
      <Dialog open={!!pagando} onOpenChange={v => { if (!v) setPagando(null) }}>
        <DialogContent className="w-full max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><HandCoins size={18} className="text-profit" /> Pagar {pagando?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Valor (R$)</Label>
              <Input value={valorPagto} onChange={e => setValorPagto(e.target.value)} className="h-11 text-lg font-semibold" placeholder="0,00" inputMode="decimal" autoFocus />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data do pagamento</Label>
              <Input type="date" value={dataPagto} onChange={e => setDataPagto(e.target.value)} className="h-10" />
            </div>
            <p className="text-[11px] text-muted-foreground">O pagamento entra como despesa no fluxo de caixa.</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPagando(null)} className="gap-1.5"><X size={14} /> Cancelar</Button>
            <Button onClick={handlePagar} disabled={processandoPagto} className="gap-1.5 bg-profit text-white hover:bg-profit/90">
              {processandoPagto ? <Loader2 size={14} className="animate-spin" /> : <HandCoins size={14} />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
