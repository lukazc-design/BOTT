'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Save, Plus, Trash2, CheckCircle, Package, Wrench, Search, Library, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { carregarPerfil, salvarPerfil } from '@/lib/storage'
import type { PerfilTecnico, CategoriaServico } from '@/lib/tipos'
import { CATEGORIAS_SERVICO } from '@/lib/tipos'
import { CATALOGO_MATERIAIS } from '@/lib/catalogo-materiais'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

// remove acentos e baixa a caixa, para busca tolerante
function norm(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const KITS_VAZIOS: Record<CategoriaServico, string[]> = {
  instalacao: [], limpeza: [], manutencao: [], vazamento: [], outros: [],
}

// Rótulo de campo pequeno acima dos inputs (deixa claro o que é editável)
function CampoLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{children}</span>
}

export function TabelaPrecos({ ativo }: { ativo?: boolean }) {
  const [perfil, setPerfil] = useState<PerfilTecnico>(carregarPerfil)
  const [salvo, setSalvo] = useState(false)
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaServico | 'todas'>('todas')
  const [buscaMaterial, setBuscaMaterial] = useState('')
  const [buscaServico, setBuscaServico] = useState('')
  const [buscaKit, setBuscaKit] = useState('')
  const [bibliotecaAberta, setBibliotecaAberta] = useState(false)

  // Recarrega ao abrir a aba (dados podem ter mudado no Perfil ou em outro dispositivo)
  useEffect(() => { if (ativo !== false) setPerfil(carregarPerfil()) }, [ativo])

  const salvar = () => {
    salvarPerfil(perfil)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2500)
  }

  // ── Materiais ───────────────────────────────────────────────────────────
  const atualizarMaterial = (id: string, campo: string, valor: string | number) => {
    setPerfil(prev => ({
      ...prev,
      materiais: prev.materiais.map(m =>
        m.id === id ? { ...m, [campo]: campo === 'nome' || campo === 'unidade' ? valor : Number(valor) } : m
      ),
    }))
  }
  const adicionarMaterial = () => {
    const id = crypto.randomUUID()
    setPerfil(prev => ({
      ...prev,
      materiais: [{ id, nome: 'Novo material', unidade: 'un', precoCusto: 0, precoVenda: 0 }, ...prev.materiais],
    }))
  }
  const removerMaterial = (id: string) => {
    setPerfil(prev => ({ ...prev, materiais: prev.materiais.filter(m => m.id !== id) }))
  }
  const adicionarDaBiblioteca = (nome: string, unidade: string) => {
    setPerfil(prev => {
      // evita duplicar pelo nome
      if (prev.materiais.some(m => norm(m.nome) === norm(nome))) return prev
      return {
        ...prev,
        materiais: [...prev.materiais, { id: crypto.randomUUID(), nome, unidade, precoCusto: 0, precoVenda: 0 }],
      }
    })
  }

  const nomesNaTabela = useMemo(
    () => new Set(perfil.materiais.map(m => norm(m.nome))),
    [perfil.materiais]
  )

  const materiaisFiltrados = useMemo(() => {
    const q = norm(buscaMaterial.trim())
    if (!q) return perfil.materiais
    return perfil.materiais.filter(m => norm(m.nome).includes(q) || norm(m.unidade).includes(q))
  }, [perfil.materiais, buscaMaterial])

  // ── Kits de material por serviço ─────────────────────────────────────────
  const kitDe = (cat: CategoriaServico) => perfil.kitsMateriais?.[cat] ?? []
  const toggleKitMaterial = (cat: CategoriaServico, materialId: string) => {
    setPerfil(prev => {
      const kits: Record<CategoriaServico, string[]> = { ...KITS_VAZIOS, ...(prev.kitsMateriais ?? {}) }
      const atual = kits[cat] ?? []
      kits[cat] = atual.includes(materialId) ? atual.filter(id => id !== materialId) : [...atual, materialId]
      return { ...prev, kitsMateriais: kits }
    })
  }
  const materiaisParaKit = useMemo(() => {
    const q = norm(buscaKit.trim())
    if (!q) return perfil.materiais
    return perfil.materiais.filter(m => norm(m.nome).includes(q))
  }, [perfil.materiais, buscaKit])

  // ── Serviços ─────────────────────────────────────────────────────────────
  const atualizarServico = (id: string, campo: string, valor: string | number) => {
    const camposTexto = ['nome', 'categoria']
    setPerfil(prev => ({
      ...prev,
      servicos: prev.servicos.map(s =>
        s.id === id ? { ...s, [campo]: camposTexto.includes(campo) ? valor : Number(valor) } : s
      ),
    }))
  }
  const adicionarServico = () => {
    const cat: CategoriaServico = filtroCategoria === 'todas' ? 'outros' : filtroCategoria
    setPerfil(prev => ({
      ...prev,
      servicos: [{ id: crypto.randomUUID(), nome: 'Novo serviço', categoria: cat, precoCusto: 0, precoVenda: 0 }, ...prev.servicos],
    }))
  }
  const removerServico = (id: string) => {
    setPerfil(prev => ({ ...prev, servicos: prev.servicos.filter(s => s.id !== id) }))
  }

  const servicosFiltrados = useMemo(() => {
    const q = norm(buscaServico.trim())
    return perfil.servicos.filter(s => {
      const catOk = filtroCategoria === 'todas' || (s.categoria ?? 'outros') === filtroCategoria
      const buscaOk = !q || norm(s.nome).includes(q)
      return catOk && buscaOk
    })
  }, [perfil.servicos, filtroCategoria, buscaServico])

  const margemMedia = perfil.materiais.length > 0
    ? (perfil.materiais.reduce((s, m) => s + (m.precoVenda > 0 ? (m.precoVenda - m.precoCusto) / m.precoVenda * 100 : 0), 0) / perfil.materiais.length).toFixed(0)
    : 0

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Tabela de Preços</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Materiais e serviços que abastecem seus orçamentos</p>
        </div>
        <Button onClick={salvar} className="gap-2">
          {salvo ? <><CheckCircle size={14} /> Salvo!</> : <><Save size={14} /> Salvar</>}
        </Button>
      </div>

      <Tabs defaultValue="materiais">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto gap-0">
          {([
            { v: 'materiais', label: 'Materiais', Icon: Package },
            { v: 'servicos', label: 'Serviços', Icon: Wrench },
          ] as const).map(({ v, label, Icon }) => (
            <TabsTrigger
              key={v}
              value={v}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent px-4 py-2 text-sm gap-1.5"
            >
              <Icon size={14} /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Materiais ─────────────────────────────────────────────────── */}
        <TabsContent value="materiais" className="pt-5 space-y-4">
          <div>
            <p className="text-sm font-medium">Tabela de Materiais</p>
            <p className="text-xs text-muted-foreground">Custo = quanto você paga. Venda = quanto cobra do cliente.</p>
          </div>

          {/* Barra de ferramentas: busca + adicionar da biblioteca + novo */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={buscaMaterial}
                onChange={e => setBuscaMaterial(e.target.value)}
                placeholder="Buscar material..."
                className="pl-8 h-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 h-9 flex-1 sm:flex-none" onClick={() => setBibliotecaAberta(true)}>
                <Library size={14} /> Biblioteca
              </Button>
              <Button size="sm" className="gap-1.5 h-9 flex-1 sm:flex-none" onClick={adicionarMaterial}>
                <Plus size={14} /> Novo
              </Button>
            </div>
          </div>

          {/* Lista de materiais em cards (sem rolagem lateral no celular) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {materiaisFiltrados.map(m => (
              <div key={m.id} className="rounded-xl border border-border bg-card p-3 space-y-2.5">
                <div className="flex items-end gap-2">
                  <label className="flex-1 space-y-1">
                    <CampoLabel>Material</CampoLabel>
                    <Input value={m.nome} onChange={e => atualizarMaterial(m.id, 'nome', e.target.value)} className="h-9 text-sm" />
                  </label>
                  <button
                    onClick={() => removerMaterial(m.id)}
                    aria-label="Remover material"
                    className="mb-1 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="space-y-1">
                    <CampoLabel>Unidade</CampoLabel>
                    <Input value={m.unidade} onChange={e => atualizarMaterial(m.id, 'unidade', e.target.value)} className="h-9 text-sm text-center" />
                  </label>
                  <label className="space-y-1">
                    <CampoLabel>Custo R$</CampoLabel>
                    <Input type="number" value={m.precoCusto} onChange={e => atualizarMaterial(m.id, 'precoCusto', e.target.value)} className="h-9 text-sm text-right text-cost" step="0.01" />
                  </label>
                  <label className="space-y-1">
                    <CampoLabel>Venda R$</CampoLabel>
                    <Input type="number" value={m.precoVenda} onChange={e => atualizarMaterial(m.id, 'precoVenda', e.target.value)} className="h-9 text-sm text-right text-sale" step="0.01" />
                  </label>
                </div>
              </div>
            ))}
          </div>
          {materiaisFiltrados.length === 0 && (
            <p className="text-center py-8 text-sm text-muted-foreground">
              {buscaMaterial ? 'Nenhum material encontrado para essa busca.' : 'Nenhum material. Use a Biblioteca ou clique em Novo.'}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">
            {perfil.materiais.length} materiais · Margem média atual: {margemMedia}%
          </p>

          <Separator />

          {/* Kits de material por serviço */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Kit de material por serviço</p>
              <p className="text-xs text-muted-foreground">
                Marque os materiais usados em cada tipo de serviço. Ao escolher o serviço no orçamento, o app já puxa esses materiais.
              </p>
            </div>

            {perfil.materiais.length > 0 && (
              <div className="relative">
                <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={buscaKit}
                  onChange={e => setBuscaKit(e.target.value)}
                  placeholder="Buscar material para marcar no kit..."
                  className="pl-8 h-9"
                />
              </div>
            )}

            {(Object.entries(CATEGORIAS_SERVICO) as [CategoriaServico, string][]).map(([cat, label]) => (
              <div key={cat} className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold mb-2">
                  {label}
                  <span className="text-muted-foreground font-normal"> · {kitDe(cat).length} {kitDe(cat).length === 1 ? 'material' : 'materiais'}</span>
                </p>
                {perfil.materiais.length === 0
                  ? <p className="text-[10px] text-muted-foreground">Cadastre materiais acima para montar o kit.</p>
                  : materiaisParaKit.length === 0
                    ? <p className="text-[10px] text-muted-foreground">Nenhum material encontrado.</p>
                    : (
                      <div className="flex flex-wrap gap-1.5">
                        {materiaisParaKit.map(m => {
                          const on = kitDe(cat).includes(m.id)
                          return (
                            <button
                              key={m.id}
                              onClick={() => toggleKitMaterial(cat, m.id)}
                              className={cn('text-[10px] px-2 py-1 rounded-md border transition-colors',
                                on ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50')}
                            >
                              {m.nome}
                            </button>
                          )
                        })}
                      </div>
                    )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Serviços ──────────────────────────────────────────────────── */}
        <TabsContent value="servicos" className="pt-5 space-y-4">
          <div>
            <p className="text-sm font-medium">Tabela de Serviços</p>
            <p className="text-xs text-muted-foreground">Custo = sua mão de obra real. Venda = o que cobra do cliente.</p>
          </div>

          {/* Busca + adicionar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={buscaServico}
                onChange={e => setBuscaServico(e.target.value)}
                placeholder="Buscar serviço..."
                className="pl-8 h-9"
              />
            </div>
            <Button size="sm" className="gap-1.5 h-9" onClick={adicionarServico}>
              <Plus size={14} /> Novo serviço
            </Button>
          </div>

          {/* Filtro por categoria */}
          <div className="flex flex-wrap gap-2">
            {(Object.entries(CATEGORIAS_SERVICO) as [CategoriaServico, string][]).map(([k, v]) => {
              const count = perfil.servicos.filter(s => (s.categoria ?? 'outros') === k).length
              return (
                <button
                  key={k}
                  onClick={() => setFiltroCategoria(filtroCategoria === k ? 'todas' : k)}
                  className={cn('text-[10px] px-2.5 py-1 rounded-full border transition-colors',
                    filtroCategoria === k ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50')}
                >
                  {v} ({count})
                </button>
              )
            })}
          </div>

          <Separator />

          {/* Lista de serviços em cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {servicosFiltrados.map(s => (
              <div key={s.id} className="rounded-xl border border-border bg-card p-3 space-y-2.5">
                <div className="flex items-end gap-2">
                  <label className="flex-1 space-y-1">
                    <CampoLabel>Serviço</CampoLabel>
                    <Input value={s.nome} onChange={e => atualizarServico(s.id, 'nome', e.target.value)} className="h-9 text-sm" />
                  </label>
                  <button
                    onClick={() => removerServico(s.id)}
                    aria-label="Remover serviço"
                    className="mb-1 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <label className="block space-y-1">
                  <CampoLabel>Categoria</CampoLabel>
                  <Select value={s.categoria ?? 'outros'} onValueChange={v => atualizarServico(s.id, 'categoria', v ?? 'outros')}>
                    <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(CATEGORIAS_SERVICO) as [CategoriaServico, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <div className="grid grid-cols-3 gap-2 items-end">
                  <label className="space-y-1">
                    <CampoLabel>Custo R$</CampoLabel>
                    <Input type="number" value={s.precoCusto} onChange={e => atualizarServico(s.id, 'precoCusto', e.target.value)} className="h-9 text-sm text-right text-cost" />
                  </label>
                  <label className="space-y-1">
                    <CampoLabel>Venda R$</CampoLabel>
                    <Input type="number" value={s.precoVenda} onChange={e => atualizarServico(s.id, 'precoVenda', e.target.value)} className="h-9 text-sm text-right text-sale" />
                  </label>
                  <div className="space-y-1">
                    <CampoLabel>Lucro</CampoLabel>
                    <div className="h-9 flex items-center justify-end px-2 rounded-lg bg-profit/10 text-sm font-semibold text-profit tabular-nums">
                      {fmt(s.precoVenda - s.precoCusto)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {servicosFiltrados.length === 0 && (
            <p className="text-center py-8 text-sm text-muted-foreground">
              {buscaServico ? 'Nenhum serviço encontrado para essa busca.' : 'Nenhum serviço nesta categoria. Clique em Novo serviço.'}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">Total de serviços cadastrados: {perfil.servicos.length}</p>
        </TabsContent>
      </Tabs>

      {/* ── Diálogo: Biblioteca de materiais ───────────────────────────── */}
      <BibliotecaDialog
        aberta={bibliotecaAberta}
        onFechar={() => setBibliotecaAberta(false)}
        nomesNaTabela={nomesNaTabela}
        onAdicionar={adicionarDaBiblioteca}
      />

      {salvo && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-profit/20 border border-profit/40 text-profit text-sm shadow-lg z-50">
          <CheckCircle size={16} /> Salvo com sucesso!
        </div>
      )}
    </div>
  )
}

// ─── Diálogo da biblioteca de materiais ──────────────────────────────────────
function BibliotecaDialog({
  aberta, onFechar, nomesNaTabela, onAdicionar,
}: {
  aberta: boolean
  onFechar: () => void
  nomesNaTabela: Set<string>
  onAdicionar: (nome: string, unidade: string) => void
}) {
  const [busca, setBusca] = useState('')

  const categoriasFiltradas = useMemo(() => {
    const q = norm(busca.trim())
    if (!q) return CATALOGO_MATERIAIS
    return CATALOGO_MATERIAIS
      .map(cat => ({
        ...cat,
        itens: cat.itens.filter(it => norm(it.nome).includes(q) || norm(cat.categoria).includes(q)),
      }))
      .filter(cat => cat.itens.length > 0)
  }, [busca])

  const totalItens = useMemo(
    () => CATALOGO_MATERIAIS.reduce((s, c) => s + c.itens.length, 0),
    []
  )

  return (
    <Dialog open={aberta} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="max-w-lg p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="p-4 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Library size={17} className="text-primary" /> Biblioteca de materiais
          </DialogTitle>
          <DialogDescription className="text-xs">
            {totalItens} materiais técnicos prontos. Toque para adicionar à sua tabela e depois defina o preço.
          </DialogDescription>
          <div className="relative mt-2">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome ou categoria (ex.: 3/8, disjuntor, dreno)..."
              className="pl-8 h-9"
              autoFocus
            />
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {categoriasFiltradas.map(cat => (
            <div key={cat.categoria}>
              <p className="text-xs font-semibold text-muted-foreground mb-2 sticky top-0 bg-background/95 py-1">
                {cat.categoria}
              </p>
              <div className="space-y-1.5">
                {cat.itens.map(it => {
                  const jaAdicionado = nomesNaTabela.has(norm(it.nome))
                  return (
                    <div
                      key={it.nome}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{it.nome}</p>
                        <p className="text-[10px] text-muted-foreground">Unidade: {it.unidade}</p>
                      </div>
                      {jaAdicionado ? (
                        <span className="flex items-center gap-1 text-[10px] text-profit font-medium flex-shrink-0">
                          <CheckCircle size={13} /> Na tabela
                        </span>
                      ) : (
                        <Button
                          size="sm" variant="outline"
                          className="h-7 gap-1 text-xs flex-shrink-0"
                          onClick={() => onAdicionar(it.nome, it.unidade)}
                        >
                          <Plus size={13} /> Adicionar
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {categoriasFiltradas.length === 0 && (
            <p className="text-center py-8 text-sm text-muted-foreground">Nenhum material encontrado para “{busca}”.</p>
          )}
        </div>

        <div className="p-3 border-t border-border flex justify-end">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onFechar}>
            <X size={14} /> Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
