'use client'

import { useEffect, useState } from 'react'
import { Save, CheckCircle, Upload, X, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { carregarPerfil, salvarPerfil } from '@/lib/storage'
import type { PerfilTecnico, LayoutOrcamento } from '@/lib/tipos'
import { LAYOUTS_ORCAMENTO } from '@/lib/tipos'
import { extrairCorDominante } from '@/lib/extrair-cores'

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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Dados da empresa, identidade visual e IA</p>
        </div>
        <Button onClick={salvar} className="gap-2">
          {salvo ? <><CheckCircle size={14} /> Salvo!</> : <><Save size={14} /> Salvar Perfil</>}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Logo + identidade visual */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload de Logo */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logomarca</Label>
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                {perfil.logoBase64 ? (
                  <img src={perfil.logoBase64 || "/placeholder.svg"} alt="Logo" className="w-full h-full object-contain p-1" />
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
                  perfil.layoutOrcamento === key ? 'border-primary bg-primary/5' : 'border-border bg-card'
                )}
              >
                {perfil.layoutOrcamento === key && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <CheckCircle size={10} className="text-primary-foreground" />
                  </div>
                )}
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

        {/* Provedor de IA */}
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
                (perfil.provedorIA ?? 'nuvem') === 'nuvem' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
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
                perfil.provedorIA === 'local' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
              )}
            >
              <p className="text-sm font-medium">Local (Ollama)</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Roda no seu PC via túnel. 100% offline e grátis.</p>
            </button>
          </div>
        </div>
      </div>

      {/* Aviso de salvamento */}
      {salvo && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-profit/20 border border-profit/40 text-profit text-sm shadow-lg">
          <CheckCircle size={16} /> Perfil salvo com sucesso!
        </div>
      )}
    </div>
  )
}
