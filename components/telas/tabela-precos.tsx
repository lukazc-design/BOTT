'use client'

import { useEffect, useState } from 'react'
import { Save, Plus, Trash2, CheckCircle, Package, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { carregarPerfil, salvarPerfil } from '@/lib/storage'
import type { PerfilTecnico, CategoriaServico } from '@/lib/tipos'
import { CATEGORIAS_SERVICO } from '@/lib/tipos'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

const KITS_VAZIOS: Record<CategoriaServico, string[]> = {
  instalacao: [], limpeza: [], manutencao: [], vazamento: [], outros: [],
}

export function TabelaPrecos({ ativo }: { ativo?: boolean }) {
  const [perfil, setPerfil] = useState<PerfilTecnico>(carregarPerfil)
  const [salvo, setSalvo] = useState(false)
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaServico | 'todas'>('todas')

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
    setPerfil(prev => ({
      ...prev,
      materiais: [...prev.materiais, { id: crypto.randomUUID(), nome: 'Novo material', unidade: 'un', precoCusto: 0, precoVenda: 0 }],
    }))
  }
  const removerMaterial = (id: string) => {
    setPerfil(prev => ({ ...prev, materiais: prev.materiais.filter(m => m.id !== id) }))
  }

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
      servicos: [...prev.servicos, { id: crypto.randomUUID(), nome: 'Novo serviço', categoria: cat, precoCusto: 0, precoVenda: 0 }],
    }))
  }
  const removerServico = (id: string) => {
    setPerfil(prev => ({ ...prev, servicos: prev.servicos.filter(s => s.id !== id) }))
  }

  const margemMedia = perfil.materiais.length > 0
    ? (perfil.materiais.reduce((s, m) => s + (m.precoVenda > 0 ? (m.precoVenda - m.precoCusto) / m.precoVenda * 100 : 0), 0) / perfil.materiais.length).toFixed(0)
    : 0

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tabela de Preços</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Materiais e serviços que abastecem seus orçamentos</p>
        </div>
        <Button onClick={salvar} className="gap-2">
          {salvo ? <><CheckCircle size={14} /> Salvo!</> : <><Save size={14} /> Salvar</>}
        </Button>
      </div>

      <Tabs defaultValue="materiais">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto gap-0">
          {[['materiais', 'Materiais', Package], ['servicos', 'Serviços', Wrench]].map(([v, label, Icon]) => (
            <TabsTrigger
              key={v as string}
              value={v as string}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent px-4 py-2 text-sm gap-1.5"
            >
              {/* @ts-expect-error Icon é um componente lucide */}
              <Icon size={14} /> {label as string}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Materiais ─────────────────────────────────────────────────── */}
        <TabsContent value="materiais" className="pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Tabela de Materiais</p>
              <p className="text-xs text-muted-foreground">Custo = quanto você paga. Venda = quanto cobra do cliente.</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={adicionarMaterial}>
              <Plus size={13} /> Adicionar
            </Button>
          </div>
          <Separator />
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-xs min-w-[460px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium min-w-[180px]">Material</th>
                  <th className="text-center px-2 py-2 text-muted-foreground font-medium w-16">Un.</th>
                  <th className="text-right px-3 py-2 text-cost font-medium w-28">Custo (R$)</th>
                  <th className="text-right px-3 py-2 text-sale font-medium w-28">Venda (R$)</th>
                  <th className="w-8 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {perfil.materiais.map((m, i) => (
                  <tr key={m.id} className={cn('border-b border-border last:border-0', i % 2 === 0 ? 'bg-background' : 'bg-card')}>
                    <td className="px-2 py-1.5">
                      <Input value={m.nome} onChange={e => atualizarMaterial(m.id, 'nome', e.target.value)} className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input value={m.unidade} onChange={e => atualizarMaterial(m.id, 'unidade', e.target.value)} className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 text-center" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" value={m.precoCusto} onChange={e => atualizarMaterial(m.id, 'precoCusto', e.target.value)} className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 text-right text-cost" step="0.01" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" value={m.precoVenda} onChange={e => atualizarMaterial(m.id, 'precoVenda', e.target.value)} className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 text-right text-sale" step="0.01" />
                    </td>
                    <td className="px-2 py-1.5">
                      <button onClick={() => removerMaterial(m.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
                {perfil.materiais.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Nenhum material. Clique em &quot;Adicionar&quot;.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground">Margem média atual: {margemMedia}%</p>

          <Separator />

          {/* Kits de material por serviço */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Kit de material por serviço</p>
              <p className="text-xs text-muted-foreground">
                Marque os materiais usados em cada tipo de serviço. Ao escolher o serviço no orçamento, o app já puxa esses materiais.
              </p>
            </div>
            {(Object.entries(CATEGORIAS_SERVICO) as [CategoriaServico, string][]).map(([cat, label]) => (
              <div key={cat} className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold mb-2">
                  {label}
                  <span className="text-muted-foreground font-normal"> · {kitDe(cat).length} {kitDe(cat).length === 1 ? 'material' : 'materiais'}</span>
                </p>
                {perfil.materiais.length === 0
                  ? <p className="text-[10px] text-muted-foreground">Cadastre materiais acima para montar o kit.</p>
                  : (
                    <div className="flex flex-wrap gap-1.5">
                      {perfil.materiais.map(m => {
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
        <TabsContent value="servicos" className="pt-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-medium">Tabela de Serviços</p>
              <p className="text-xs text-muted-foreground">Custo = sua mão de obra real. Venda = o que cobra do cliente.</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filtroCategoria} onValueChange={v => setFiltroCategoria((v as CategoriaServico | 'todas') ?? 'todas')}>
                <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas" className="text-xs">Todas as categorias</SelectItem>
                  {(Object.entries(CATEGORIAS_SERVICO) as [CategoriaServico, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={adicionarServico}>
                <Plus size={13} /> Adicionar
              </Button>
            </div>
          </div>

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
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium w-36">Categoria</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium min-w-[240px]">Serviço</th>
                  <th className="text-right px-3 py-2 text-cost font-medium w-28">Custo (R$)</th>
                  <th className="text-right px-3 py-2 text-sale font-medium w-28">Venda (R$)</th>
                  <th className="text-right px-3 py-2 text-profit font-medium w-24">Lucro</th>
                  <th className="w-8 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {perfil.servicos
                  .filter(s => filtroCategoria === 'todas' || (s.categoria ?? 'outros') === filtroCategoria)
                  .map((s, i) => (
                    <tr key={s.id} className={cn('border-b border-border last:border-0', i % 2 === 0 ? 'bg-background' : 'bg-card')}>
                      <td className="px-2 py-1.5">
                        <Select value={s.categoria ?? 'outros'} onValueChange={v => atualizarServico(s.id, 'categoria', v ?? 'outros')}>
                          <SelectTrigger className="h-7 text-[10px] border-0 bg-transparent px-1 focus:ring-0 w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.entries(CATEGORIAS_SERVICO) as [CategoriaServico, string][]).map(([k, v]) => (
                              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1.5">
                        <Input value={s.nome} onChange={e => atualizarServico(s.id, 'nome', e.target.value)} className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input type="number" value={s.precoCusto} onChange={e => atualizarServico(s.id, 'precoCusto', e.target.value)} className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 text-right text-cost" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input type="number" value={s.precoVenda} onChange={e => atualizarServico(s.id, 'precoVenda', e.target.value)} className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 text-right text-sale" />
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-profit">{fmt(s.precoVenda - s.precoCusto)}</td>
                      <td className="px-2 py-1.5">
                        <button onClick={() => removerServico(s.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                {perfil.servicos.filter(s => filtroCategoria === 'todas' || (s.categoria ?? 'outros') === filtroCategoria).length === 0 && (
                  <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Nenhum serviço nesta categoria. Clique em &quot;Adicionar&quot;.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground">Total de serviços cadastrados: {perfil.servicos.length}</p>
        </TabsContent>
      </Tabs>

      {salvo && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-profit/20 border border-profit/40 text-profit text-sm shadow-lg z-50">
          <CheckCircle size={16} /> Salvo com sucesso!
        </div>
      )}
    </div>
  )
}
