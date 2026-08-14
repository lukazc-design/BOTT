'use client'

import { useEffect, useState } from 'react'
import { Save, Plus, Trash2, CheckCircle, AlertCircle, Upload, X, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { carregarPerfil, salvarPerfil } from '@/lib/storage'
import type { PerfilTecnico, CategoriaServico, LayoutOrcamento } from '@/lib/tipos'
import { CATEGORIAS_SERVICO, LAYOUTS_ORCAMENTO } from '@/lib/tipos'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { extrairCorDominante } from '@/lib/extrair-cores'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

function LayoutMiniPreview({ tipo, cor }: { tipo: LayoutOrcamento; cor: string }) {
  const bg = cor
  if (tipo === 'classico') return (
    <div className="w-full h-14 rounded-md overflow-hidden border border-border bg-white">
      <div style={{ background: bg }} className="h-5 w-full flex items-center px-1.5 gap-1">
        <div className="w-3 h-3 rounded-sm bg-white/30" />
        <div className="flex-1 h-1 rounded bg-white/50" />
      </div>
      <div className="p-1 space-y-0.5">
        <div className="h-1 w-3/4 rounded bg-gray-200" />
        <div className="h-1 w-1/2 rounded bg-gray-200" />
        <div className="h-1 w-2/3 rounded bg-gray-100" />
      </div>
    </div>
  )
  if (tipo === 'moderno') return (
    <div className="w-full h-14 rounded-md overflow-hidden border border-border bg-white">
      <div style={{ background: '#0f172a' }} className="h-6 w-full flex items-center justify-center gap-1">
        <div className="w-3 h-3 rounded-sm" style={{ background: bg }} />
        <div className="h-1.5 w-12 rounded" style={{ background: bg + '80' }} />
      </div>
      <div className="p-1 space-y-0.5">
        <div className="h-1 w-full rounded" style={{ background: bg + '30' }} />
        <div className="h-1 w-2/3 rounded bg-gray-100" />
        <div className="h-1 w-1/2 rounded bg-gray-100" />
      </div>
    </div>
  )
  if (tipo === 'minimalista') return (
    <div className="w-full h-14 rounded-md overflow-hidden border border-border bg-white">
      <div className="h-2 w-full" style={{ background: bg }} />
      <div className="p-1.5 space-y-0.5">
        <div className="flex justify-between items-center">
          <div className="h-2 w-8 rounded bg-gray-300" />
          <div className="h-1 w-6 rounded bg-gray-200" />
        </div>
        <div className="h-px w-full bg-gray-200 my-0.5" />
        <div className="h-1 w-3/4 rounded bg-gray-100" />
        <div className="h-1 w-1/2 rounded bg-gray-100" />
      </div>
    </div>
  )
  // corporativo
  return (
    <div className="w-full h-14 rounded-md overflow-hidden border border-border bg-white flex">
      <div style={{ background: bg }} className="w-8 h-full flex flex-col items-center pt-1.5 gap-1">
        <div className="w-4 h-4 rounded bg-white/20" />
        <div className="w-3 h-0.5 rounded bg-white/30" />
        <div className="w-3 h-0.5 rounded bg-white/30" />
      </div>
      <div className="flex-1 p-1.5 space-y-0.5">
        <div className="h-1.5 w-2/3 rounded bg-gray-200" />
        <div className="h-px w-full bg-gray-100" />
        <div className="h-1 w-full rounded bg-gray-100" />
        <div className="h-1 w-3/4 rounded bg-gray-100" />
      </div>
    </div>
  )
}

export function Perfil({ onOllamaStatus }: { onOllamaStatus?: (online: boolean) => void }) {
  const [perfil, setPerfil] = useState<PerfilTecnico>(carregarPerfil)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    setPerfil(carregarPerfil())
  }, [])

  const atualizar = (campo: string, valor: unknown) => {
    setPerfil(prev => ({ ...prev, [campo]: valor }))
  }

  const salvar = () => {
    salvarPerfil(perfil)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2500)
  }

  // ── Materiais ─────────────────────────────────────────────────────────────
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
      materiais: [
        ...prev.materiais,
        { id: crypto.randomUUID(), nome: 'Novo material', unidade: 'un', precoCusto: 0, precoVenda: 0 },
      ],
    }))
  }

  const removerMaterial = (id: string) => {
    setPerfil(prev => ({ ...prev, materiais: prev.materiais.filter(m => m.id !== id) }))
  }

  // ── Kits de material por serviço ───────────────────────────────────────────
  const KITS_VAZIOS: Record<CategoriaServico, string[]> = {
    instalacao: [], limpeza: [], manutencao: [], vazamento: [], outros: [],
  }
  const kitDe = (cat: CategoriaServico) => perfil.kitsMateriais?.[cat] ?? []
  const toggleKitMaterial = (cat: CategoriaServico, materialId: string) => {
    setPerfil(prev => {
      const kits: Record<CategoriaServico, string[]> = { ...KITS_VAZIOS, ...(prev.kitsMateriais ?? {}) }
      const atual = kits[cat] ?? []
      kits[cat] = atual.includes(materialId) ? atual.filter(id => id !== materialId) : [...atual, materialId]
      return { ...prev, kitsMateriais: kits }
    })
  }

  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaServico | 'todas'>('todas')

  // ── Serviços ──────────────────────────────────────────────────────────────
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
      servicos: [
        ...prev.servicos,
        { id: crypto.randomUUID(), nome: 'Novo serviço', categoria: cat, precoCusto: 0, precoVenda: 0 },
      ],
    }))
  }

  const removerServico = (id: string) => {
    setPerfil(prev => ({ ...prev, servicos: prev.servicos.filter(s => s.id !== id) }))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Configure dados da empresa e tabela de preços</p>
        </div>
        <Button onClick={salvar} className="gap-2">
          {salvo ? <><CheckCircle size={14} /> Salvo!</> : <><Save size={14} /> Salvar Perfil</>}
        </Button>
      </div>

      <Tabs defaultValue="empresa">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto gap-0">
          {['empresa', 'materiais', 'servicos'].map(t => (
            <TabsTrigger
              key={t}
              value={t}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent px-4 py-2 text-sm capitalize"
            >
              {t === 'materiais' ? 'Tabela de Materiais' :
               t === 'servicos' ? 'Tabela de Serviços' : 'Empresa'}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Empresa ─────────────────────────────────────────────────── */}
        <TabsContent value="empresa" className="pt-6 space-y-6">

          {/* Logo + identidade visual */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload de Logo */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logomarca</Label>
              <div className="flex items-start gap-4">
                {/* Preview */}
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {perfil.logoBase64 ? (
                    <img src={perfil.logoBase64} alt="Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <div className="text-center text-muted-foreground p-2">
                      <Upload size={20} className="mx-auto mb-1 opacity-40" />
                      <span className="text-[10px]">Sem logo</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = async ev => {
                          const base64 = ev.target?.result as string
                          atualizar('logoBase64', base64)
                          // Extrai cor dominante da logo automaticamente
                          try {
                            const cor = await extrairCorDominante(base64)
                            atualizar('corPrimaria', cor)
                          } catch { /* mantém cor atual */ }
                        }
                        reader.readAsDataURL(file)
                      }}
                    />
                    <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer">
                      <Upload size={12} /> Carregar imagem
                    </span>
                  </label>
                  {perfil.logoBase64 && (
                    <button
                      onClick={() => atualizar('logoBase64', '')}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors w-fit"
                    >
                      <X size={12} /> Remover logo
                    </button>
                  )}
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    PNG, JPG ou SVG. Aparecerá no cabeçalho de todos os orçamentos exportados.
                  </p>
                </div>
              </div>
            </div>

            {/* Cor primária */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Palette size={12} /> Cor da marca
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={perfil.corPrimaria ?? '#0ea5e9'}
                  onChange={e => atualizar('corPrimaria', e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border border-border bg-transparent p-0.5"
                />
                <div>
                  <p className="text-sm font-mono">{perfil.corPrimaria ?? '#0ea5e9'}</p>
                  <p className="text-[10px] text-muted-foreground">Usada no cabeçalho e destaques do PDF</p>
                </div>
                {/* Cores rápidas */}
                <div className="flex gap-1.5 ml-2">
                  {['#0ea5e9','#2563eb','#7c3aed','#dc2626','#16a34a','#ea580c','#0f172a'].map(cor => (
                    <button
                      key={cor}
                      onClick={() => atualizar('corPrimaria', cor)}
                      style={{ background: cor }}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 transition-all',
                        perfil.corPrimaria === cor ? 'border-foreground scale-110' : 'border-transparent'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Layout de orçamento */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layout do Orçamento (PDF)</Label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.entries(LAYOUTS_ORCAMENTO) as [LayoutOrcamento, { nome: string; descricao: string }][]).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => atualizar('layoutOrcamento', key)}
                  className={cn(
                    'relative p-3 rounded-xl border-2 text-left transition-all hover:border-primary/50',
                    perfil.layoutOrcamento === key
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card'
                  )}
                >
                  {perfil.layoutOrcamento === key && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle size={10} className="text-primary-foreground" />
                    </div>
                  )}
                  {/* Mini preview visual */}
                  <LayoutMiniPreview tipo={key} cor={perfil.corPrimaria ?? '#0ea5e9'} />
                  <p className="text-xs font-semibold mt-2">{info.nome}</p>
                  <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{info.descricao}</p>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Dados da empresa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Seu Nome</Label>
              <Input value={perfil.nome} onChange={e => atualizar('nome', e.target.value)} placeholder="João Silva" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nome da Empresa</Label>
              <Input value={perfil.empresa} onChange={e => atualizar('empresa', e.target.value)} placeholder="Frio & Clima Serviços" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone / WhatsApp</Label>
              <Input value={perfil.telefone} onChange={e => atualizar('telefone', e.target.value)} placeholder="(00) 00000-0000" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input value={perfil.email} onChange={e => atualizar('email', e.target.value)} placeholder="contato@empresa.com" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cidade</Label>
              <Input value={perfil.cidade} onChange={e => atualizar('cidade', e.target.value)} placeholder="São Paulo" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estado</Label>
              <Input value={perfil.estado} onChange={e => atualizar('estado', e.target.value)} placeholder="SP" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">CNPJ / CPF</Label>
              <Input value={perfil.cnpj ?? ''} onChange={e => atualizar('cnpj', e.target.value)} placeholder="00.000.000/0001-00" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Validade padrão do orçamento (dias)</Label>
              <Input type="number" value={perfil.validadeOrcamentoDias} onChange={e => atualizar('validadeOrcamentoDias', Number(e.target.value))} className="h-9 text-sm" min={1} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Observações padrão (use {'{validade}'} para inserir o prazo)</Label>
            <Textarea
              value={perfil.observacoesPadrao}
              onChange={e => atualizar('observacoesPadrao', e.target.value)}
              className="text-sm resize-none h-20"
            />
          </div>

          {/* ── Provedor de IA ──────────────────────────────────────────── */}
          <div className="space-y-2 rounded-xl border border-border bg-card/50 p-4">
            <Label className="text-xs font-semibold">Inteligência Artificial</Label>
            <p className="text-[11px] text-muted-foreground">
              Escolha como a IA interpreta os pedidos. A opção na nuvem funciona para todos, sem precisar do seu PC ligado.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => atualizar('provedorIA', 'nuvem')}
                className={cn(
                  'rounded-lg border p-3 text-left transition-all',
                  (perfil.provedorIA ?? 'nuvem') === 'nuvem'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <p className="text-sm font-medium">Nuvem (Gemini)</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Recomendado. Online 24h, rápido, sem túnel.</p>
              </button>
              <button
                type="button"
                onClick={() => atualizar('provedorIA', 'local')}
                className={cn(
                  'rounded-lg border p-3 text-left transition-all',
                  perfil.provedorIA === 'local'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <p className="text-sm font-medium">Local (Ollama)</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Roda no seu PC via túnel. 100% offline e grátis.</p>
              </button>
            </div>
          </div>
        </TabsContent>

        {/* ── Materiais ────────────────────────────────────────────────── */}
        <TabsContent value="materiais" className="pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Tabela de Materiais</p>
              <p className="text-xs text-muted-foreground">Modo custo = quanto você paga. Modo venda = quanto cobra do cliente.</p>
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
                      <Input
                        value={m.nome}
                        onChange={e => atualizarMaterial(m.id, 'nome', e.target.value)}
                        className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={m.unidade}
                        onChange={e => atualizarMaterial(m.id, 'unidade', e.target.value)}
                        className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 text-center"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        value={m.precoCusto}
                        onChange={e => atualizarMaterial(m.id, 'precoCusto', e.target.value)}
                        className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 text-right text-cost"
                        step="0.01"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        value={m.precoVenda}
                        onChange={e => atualizarMaterial(m.id, 'precoVenda', e.target.value)}
                        className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 text-right text-sale"
                        step="0.01"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <button onClick={() => removerMaterial(m.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Margem média atual: {perfil.materiais.length > 0
              ? (perfil.materiais.reduce((s, m) => s + (m.precoVenda > 0 ? (m.precoVenda - m.precoCusto) / m.precoVenda * 100 : 0), 0) / perfil.materiais.length).toFixed(0)
              : 0}%
          </p>

          <Separator />

          {/* ── Kits de material por serviço ──────────────────────────── */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Kit de material por serviço</p>
              <p className="text-xs text-muted-foreground">
                Marque os materiais que você normalmente usa em cada tipo de serviço. Ao escolher o serviço no orçamento, o app já puxa esses materiais para você — a quantidade você fala ou ajusta.
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
                        const ativo = kitDe(cat).includes(m.id)
                        return (
                          <button
                            key={m.id}
                            onClick={() => toggleKitMaterial(cat, m.id)}
                            className={cn(
                              'text-[10px] px-2 py-1 rounded-md border transition-colors',
                              ativo
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:border-primary/50'
                            )}
                          >
                            {m.nome}
                          </button>
                        )
                      })}
                    </div>
                  )
                }
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Serviços ─────────────────────────────────────────────────── */}
        <TabsContent value="servicos" className="pt-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-medium">Tabela de Serviços</p>
              <p className="text-xs text-muted-foreground">Custo = sua mão de obra real. Venda = o que cobra do cliente.</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filtroCategoria} onValueChange={v => setFiltroCategoria(v as CategoriaServico | 'todas')}>
                <SelectTrigger className="h-8 text-xs w-40">
                  <SelectValue />
                </SelectTrigger>
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

          {/* Pills de contagem por categoria */}
          <div className="flex flex-wrap gap-2">
            {(Object.entries(CATEGORIAS_SERVICO) as [CategoriaServico, string][]).map(([k, v]) => {
              const count = perfil.servicos.filter(s => (s.categoria ?? 'outros') === k).length
              return (
                <button
                  key={k}
                  onClick={() => setFiltroCategoria(filtroCategoria === k ? 'todas' : k)}
                  className={cn(
                    'text-[10px] px-2.5 py-1 rounded-full border transition-colors',
                    filtroCategoria === k
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
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
                        <Select
                          value={s.categoria ?? 'outros'}
                          onValueChange={v => atualizarServico(s.id, 'categoria', v ?? 'outros')}
                        >
                          <SelectTrigger className="h-7 text-[10px] border-0 bg-transparent px-1 focus:ring-0 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.entries(CATEGORIAS_SERVICO) as [CategoriaServico, string][]).map(([k, v]) => (
                              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={s.nome}
                          onChange={e => atualizarServico(s.id, 'nome', e.target.value)}
                          className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          value={s.precoCusto}
                          onChange={e => atualizarServico(s.id, 'precoCusto', e.target.value)}
                          className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 text-right text-cost"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          value={s.precoVenda}
                          onChange={e => atualizarServico(s.id, 'precoVenda', e.target.value)}
                          className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 text-right text-sale"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-profit">
                        {fmt(s.precoVenda - s.precoCusto)}
                      </td>
                      <td className="px-2 py-1.5">
                        <button onClick={() => removerServico(s.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                {perfil.servicos.filter(s => filtroCategoria === 'todas' || (s.categoria ?? 'outros') === filtroCategoria).length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-muted-foreground">
                      Nenhum serviço nesta categoria. Clique em &quot;Adicionar&quot; para criar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Total de serviços cadastrados: {perfil.servicos.length}
          </p>
        </TabsContent>
      </Tabs>

      {/* Aviso de salvamento */}
      {salvo && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-profit/20 border border-profit/40 text-profit text-sm shadow-lg">
          <CheckCircle size={16} /> Perfil salvo com sucesso!
        </div>
      )}
    </div>
  )
}
