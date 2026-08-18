'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Mic, MicOff, Send, Loader2, Plus, Trash2,
  RefreshCw, CheckCircle, AlertCircle, ChevronDown, ChevronUp, X,
  Bot, User, Cpu, Eye, ArrowLeft, FileText,
  Zap, Download, Users, Lock, ShoppingCart,
  Package, Zap as ZapElec, Settings2, Wrench,
  Store, Calculator, UserRound, TrendingUp, HandCoins,
  Share2, Percent, LayoutGrid, List, Cable, Wind,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { carregarPerfil, salvarOrcamento, carregarOrcamentos } from '@/lib/storage'
import { salvarOrcamento as salvarOrcamentoDB } from '@/lib/actions/orcamentos'
import { listarClientes } from '@/lib/actions/clientes'
import {
  montarEquipamento, gerarItensEquipamento, calcularTotais, gerarNumeroOrcamento,
  formatarBtu, rotuloTipo,
} from '@/lib/motor-calculo'
import { MARCAS_DISPONIVEIS, TIPOS_DISPONIVEIS } from '@/lib/dados-tecnicos'
import type { Orcamento, EquipamentoOrcamento, ItemOrcamento, PrecoServico, PrecoMaterial, CategoriaServico } from '@/lib/tipos'
import { CATEGORIAS_SERVICO } from '@/lib/tipos'
import { gerarHtmlPdf, type VersaoPdf } from '@/lib/gerar-pdf'

// ─── TIPOS EXPORTADOS ─────────────────────────────────────────────────────────
export interface MensagemChat {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface EstadoChat {
  mensagens: MensagemChat[]
  equipamentos: EquipamentoOrcamento[]
  itens: ItemOrcamento[]
  clienteNome: string
  clienteEndereco: string
  clienteTelefone: string
  observacoes: string
  orcamentoSalvo: Orcamento | null
}

interface IAEquipamento {
  marca: string; tipo: string; btu: number; quantidade: number
  ambiente: string; distanciaTubulacao: number; tensao: string
}

interface IAItemExtra {
  descricao: string
  quantidade?: number
  unidade?: string
  precoCusto?: number
  precoVenda?: number
  categoria?: 'material' | 'servico' | 'outros'
  _op: 'add' | 'remove'
}

interface IAAcao {
  acao: string; mensagem?: string
  clienteNome?: string; clienteEndereco?: string; clienteTelefone?: string
  equipamentos?: IAEquipamento[]
  itensExtras?: IAItemExtra[]
  observacoes?: string
}

// ─── PARSER LOCAL DE FALLBACK ─────────────────────────────────────────────────
// Extrai equipamentos diretamente do texto do usuário sem precisar da IA
function parsearTextoLocalmente(texto: string): IAAcao | null {
  const t = texto.toLowerCase()

  // Detecta BTUs mencionados: "12000", "12.000", "12 mil", "12k"
  const btus: number[] = []
  const btuRegexes = [
    /(\d{1,2})[.,](\d{3})\s*btu/gi,
    /(\d+)\s*mil\s*btu/gi,
    /(\d+)k\s*btu/gi,
    /(\d{4,6})\s*btu/gi,
    /btu\s*(?:de\s*)?(\d{4,6})/gi,
    /splits?\s+de\s+(\d{1,2})[.,]?(\d{3})?/gi,
  ]
  for (const rx of btuRegexes) {
    let m: RegExpExecArray | null
    while ((m = rx.exec(texto)) !== null) {
      let val = 0
      if (m[2] && m[2].length === 3) val = parseInt(m[1]) * 1000 + parseInt(m[2])
      else if (m[1] && !m[2]) val = parseInt(m[1]) > 500 ? parseInt(m[1]) : parseInt(m[1]) * 1000
      else val = parseInt(m[1]) * 1000
      if (val >= 5000 && val <= 120000) btus.push(val)
    }
  }
  if (btus.length === 0) return null

  // Detecta distâncias: "3m", "3 metros", "distância de 3"
  const distancias: number[] = []
  const distRx = /(\d+(?:[.,]\d+)?)\s*m(?:etros?)?/gi
  let dm: RegExpExecArray | null
  while ((dm = distRx.exec(texto)) !== null) {
    const v = parseFloat(dm[1].replace(',', '.'))
    if (v >= 1 && v <= 100) distancias.push(v)
  }

  // Detecta marca
  const marcas = ['samsung', 'lg', 'midea', 'springer', 'elgin', 'electrolux', 'hitachi', 'fujitsu', 'carrier', 'brastemp', 'consul', 'york', 'komeco', 'gree', 'daikin']
  let marcaDetectada = ''
  for (const m of marcas) {
    if (t.includes(m)) { marcaDetectada = m.charAt(0).toUpperCase() + m.slice(1); break }
  }

  // Detecta nome do cliente — padrão "cliente/seu/dona/sr [Nome]" ou "do/da/de/pro/pra [Nome]"
  let clienteNome = ''
  const clienteRx = /(?:cliente|sr\.?|sra\.?|dona|seu|dr\.?|do|da|de|para|pro|pra)\s+([A-ZÀ-Ú][a-zA-ZÀ-ú]+(?:\s+[A-ZÀ-Ú][a-zA-ZÀ-ú]+)?)/
  const cm = texto.match(clienteRx)
  if (cm) clienteNome = cm[1].trim()

  // Detecta endereço — "rua/avenida/av X [número]"
  let clienteEndereco = ''
  const endRx = /((?:rua|avenida|av\.?|travessa|alameda|rodovia|estrada|praça)\s+[A-Za-zÀ-ú0-9\s,ºª.-]{3,60}?(?:\s*n?º?\s*\d{1,6})?)(?:\s+(?:bairro|apto|apartamento|casa|com|telefone|fone|zap|,|$))/i
  const em = texto.match(endRx)
  if (em) clienteEndereco = em[1].trim().replace(/\s+/g, ' ')

  // Detecta telefone — 8 a 11 dígitos (aceita separadores)
  let clienteTelefone = ''
  const telRx = /(?:telefone|fone|zap|whats|contato|celular)?\s*\(?(\d{2})?\)?[\s-]?(\d{4,5})[\s-]?(\d{4})/i
  const tm = texto.match(telRx)
  if (tm && (tm[1] || tm[2])) {
    clienteTelefone = tm[1] ? `(${tm[1]}) ${tm[2]}-${tm[3]}` : `${tm[2]}-${tm[3]}`
  }

  const equipamentos: IAEquipamento[] = btus.map((btu, i) => ({
    marca: marcaDetectada || '',
    tipo: 'hi-wall',
    btu,
    quantidade: 1,
    ambiente: `Ambiente ${i + 1}`,
    distanciaTubulacao: distancias[i] ?? distancias[0] ?? 4,
    tensao: '220V',
  }))

  return {
    acao: 'atualizar_orcamento',
    mensagem: `${btus.length} equipamento(s) adicionado(s)${clienteNome ? ` para ${clienteNome}` : ''}.`,
    clienteNome,
    clienteEndereco,
    clienteTelefone,
    equipamentos,
  }
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function horaFormatada(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
// Chave estável de um item gerado (para guardar ajustes manuais que sobrevivem à regeneração)
function chaveItem(it: { equipamentoId?: string; categoria: string; descricao: string }) {
  return `${it.equipamentoId ?? 'x'}::${it.categoria}::${it.descricao}`
}
// Normaliza texto para casar remoções: sem acento, minúsculo, sem pontuação
function normalizarTexto(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}
// Um alvo de remoção (ex: "suporte") casa com um item se compartilham alguma palavra relevante
function itemCasaComAlvo(descricaoItem: string, alvo: string) {
  const item = normalizarTexto(descricaoItem)
  const chave = normalizarTexto(alvo)
  if (!chave) return false
  if (item.includes(chave) || chave.includes(item)) return true
  // casa por palavra (ignora palavras curtas tipo "de", "un", "o")
  const palavrasChave = chave.split(' ').filter(p => p.length >= 4)
  return palavrasChave.some(p => item.includes(p))
}
// Ícone representativo do item conforme a descrição (para a visualização em ícones)
function iconeItem(it: { descricao: string; categoria: string }, size = 14) {
  const d = it.descricao.toLowerCase()
  if (it.categoria === 'servico') return <Wrench size={size} />
  if (d.includes('fio') || d.includes('cabo') || d.includes('disjuntor')) return <ZapElec size={size} />
  if (d.includes('tubula')) return <Cable size={size} />
  if (d.includes('gás') || d.includes('gas') || d.includes('recarga')) return <Wind size={size} />
  if (d.includes('suporte')) return <Cpu size={size} />
  return <Package size={size} />
}

// ─── INDICADOR IA LOCAL ───────────────────────────────────────────────────────
function IndicadorIALocal({ online, model, url, nuvem }: { online: boolean; model: string; url: string; nuvem?: boolean }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setAberto(!aberto)}
        className={cn(
          'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-all',
          online
            ? 'border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20'
            : 'border-destructive/40 bg-destructive/10 text-destructive'
        )}
      >
        <Cpu size={11} />
        <span className="font-mono font-medium hidden sm:inline">{online ? model : 'Offline'}</span>
        <span className="font-mono font-medium sm:hidden">{online ? 'IA' : 'Off'}</span>
        {online && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
          <div className="absolute right-0 top-10 z-20 w-72 p-4 rounded-2xl bg-card border border-border shadow-2xl text-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', online ? 'bg-green-500/20' : 'bg-destructive/20')}>
                <Cpu size={16} className={online ? 'text-green-400' : 'text-destructive'} />
              </div>
              <div>
                <p className="font-semibold text-sm">{nuvem ? 'IA na nuvem (Gemini)' : 'IA rodando no seu PC'}</p>
                <p className="text-muted-foreground text-[10px]">{nuvem ? 'Rápida e sempre online' : 'Dados 100% locais, sem internet'}</p>
              </div>
            </div>
            <div className="rounded-xl bg-background border border-border p-3 space-y-2">
              <Row label="Status" valor={online ? '🟢 Online' : '🔴 Offline'} />
              <Row label="Modelo" valor={model} mono />
              <Row label="Servidor" valor={nuvem ? 'Vercel AI Gateway' : url.replace('https://', '').slice(0, 30) + '...'} mono />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              {nuvem ? 'Funciona sem depender do seu PC ligado' : 'Seus dados nunca saem do seu computador'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
function Row({ label, valor, mono }: { label: string; valor: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('text-foreground truncate max-w-[160px]', mono && 'font-mono text-[10px]')}>{valor}</span>
    </div>
  )
}

// ─── ATALHOS RÁPIDOS ──────────────────────────────────��──────────────────────
const ATALHOS = [
  'Instalar 1 split 12000 BTU sala',
  'Limpeza de ar-condicionado 18000 BTU',
  'Manutenção preventiva Midea 24000',
  'Reparo vazamento gás R-410A',
  '2 splits Daikin 9000 BTU quartos',
]

// ─── PRÉ-SELEÇÃO MANUAL ───────────────────────────────────────────────────────
// Potências comuns (BTU/h) para escolha rápida — o técnico ainda pode digitar outra.
const BTUS_COMUNS = [7000, 9000, 12000, 18000, 22000, 24000, 30000, 36000, 48000, 60000]
// Ambientes comuns para escolha rápida — também pode digitar livremente.
const AMBIENTES_COMUNS = ['Sala', 'Quarto', 'Suíte', 'Cozinha', 'Escritório', 'Recepção', 'Loja', 'Sala de reunião']

// Vinculação: cada tipo/serviço de instalação puxa automaticamente os materiais
// empregados (por palavra-chave). O técnico escolhe quais adicionar e a quantidade
// vai pela fala. Palavras-chave batem com os nomes dos materiais do perfil.
const SERVICO_MATERIAIS: Record<CategoriaServico, string[]> = {
  instalacao: ['tubula', 'suporte', 'dreno', 'fio', 'disjuntor', 'flex', 'braçadeira', 'proteção uv'],
  limpeza:    ['dreno'],
  manutencao: ['fio', 'disjuntor', 'dreno'],
  vazamento:  ['tubula', 'dreno'],
  outros:     [],
}

// ─── PREVIEW INLINE ──────────────────────────────────────────────────────────
function PreviewOrcamento({
  equipamentos, itens, totais, clienteNome, clienteEndereco, clienteTelefone, observacoes,
  onVoltar, onSalvar, salvando, salvo, modoCompacto = false,
}: {
  equipamentos: EquipamentoOrcamento[]
  itens: ItemOrcamento[]
  totais: { totalCusto: number; totalVenda: number; lucro: number; margemLucro: number }
  clienteNome: string; clienteEndereco: string; clienteTelefone: string; observacoes: string
  onVoltar: () => void
  onSalvar: () => void
  salvando: boolean
  salvo: boolean
  modoCompacto?: boolean
}) {
  const perfil = carregarPerfil()
  const [versao, setVersao] = useState<VersaoPdf>('cliente')
  const [subInterna, setSubInterna] = useState<'com-custo' | 'sem-custo'>('com-custo')
  const [materiaisAbertos, setMateriaisAbertos] = useState(false)
  const [modoLista, setModoLista] = useState<'lista' | 'icones'>('lista')
  const cor = perfil.corPrimaria ?? '#0ea5e9'
  const versaoExport: VersaoPdf = versao === 'interna' ? (subInterna === 'com-custo' ? 'interna' : 'interna-sem-custo') : versao

  // Totais por categoria para o gráfico
  const porCategoria = {
    servico: itens.filter(i => i.categoria === 'servico').reduce((s, i) => s + i.precoVenda * i.quantidade, 0),
    material: itens.filter(i => i.categoria === 'material' || i.categoria === 'equipamento').reduce((s, i) => s + i.precoVenda * i.quantidade, 0),
    outros: itens.filter(i => i.categoria === 'outros').reduce((s, i) => s + i.precoVenda * i.quantidade, 0),
  }
  const totalGraf = porCategoria.servico + porCategoria.material + porCategoria.outros || 1

  // Cria orçamento temporário para exportar o PDF antes de salvar
  const montarOrcamentoTemp = (): Orcamento => {
    const validade = new Date()
    validade.setDate(validade.getDate() + perfil.validadeOrcamentoDias)
    return {
      id: 'preview',
      numero: 'PRE-VISUALIZACAO',
      dataCriacao: new Date().toISOString(),
      validade: validade.toISOString(),
      status: 'rascunho',
      clienteNome, clienteEndereco, clienteTelefone,
      clienteEmail: '',
      equipamentos, itens,
      ...totais,
      observacoes: observacoes || '',
      prompt: '',
    }
  }

  const exportarPDF = (v?: VersaoPdf) => {
    const orc = montarOrcamentoTemp()
    const html = gerarHtmlPdf(orc, perfil, v ?? versaoExport)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    // Nome do arquivo sugerido no "Salvar como PDF" = nome do cliente + empresa
    setTimeout(() => { try { win.document.title = `Orcamento${clienteNome ? ' - ' + clienteNome : ''}${perfil.empresa ? ' - ' + perfil.empresa : ''}` } catch {} win.print() }, 600)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header — comportamento diferente se for painel lateral ou tela cheia */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-card/50 flex-shrink-0">
        <button
          onClick={onVoltar}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft size={13} /> {modoCompacto ? 'Editar' : 'Voltar'}
        </button>
        {!modoCompacto && <span className="text-muted-foreground/40 text-sm">|</span>}
        {!modoCompacto && <span className="text-sm font-medium text-foreground/80">Documento do orçamento</span>}
        <div className="ml-auto">
          <Button
            onClick={onSalvar}
            disabled={salvando || salvo}
            size="sm"
            className="gap-1.5 h-7 text-xs px-3"
          >
            {salvando
              ? <><Loader2 size={11} className="animate-spin" /> Salvando...</>
              : salvo
                ? <><CheckCircle size={11} /> Salvo!</>
                : <><CheckCircle size={11} /> Salvar</>}
          </Button>
        </div>
      </div>

      {/* Preview scrollável — pb extra p/ o rodape de exportacao nao ficar colado na barra do celular */}
      <div className="flex-1 overflow-y-auto p-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto space-y-3">

          {/* Cabeçalho da empresa */}
          <div
            className="rounded-2xl p-5 text-white relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${cor} 0%, ${cor}aa 100%)` }}
          >
            {perfil.logoBase64 && (
              <img src={perfil.logoBase64} alt="Logo" className="h-12 object-contain mb-3 brightness-0 invert" />
            )}
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold leading-tight">{perfil.empresa || 'Sua Empresa'}</h2>
                {perfil.cnpj && <p className="text-white/70 text-xs mt-0.5">CNPJ: {perfil.cnpj}</p>}
                <p className="text-white/80 text-sm mt-1">{[perfil.telefone, perfil.email].filter(Boolean).join('  ·  ')}</p>
                <p className="text-white/70 text-xs">{perfil.cidade}{perfil.estado ? `, ${perfil.estado}` : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-[10px] uppercase tracking-widest">Proposta Comercial</p>
                <p className="text-white/90 font-mono text-xl font-bold">Orçamento</p>
                <p className="text-white/70 text-xs">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {/* Dashboard de composicao — apenas versoes cliente e interna */}
          {versao !== 'loja' && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-3">Composicao do Orcamento</p>
              <div className="flex items-center gap-4">
                {/* Donut SVG */}
                <div className="shrink-0">
                  <DonutChart
                    servico={porCategoria.servico}
                    material={porCategoria.material}
                    outros={porCategoria.outros}
                    total={totalGraf}
                    cor={cor}
                  />
                </div>
                {/* Legenda + valores */}
                <div className="flex-1 space-y-2">
                  {[
                    { label: 'Materiais', valor: porCategoria.material, cor: cor },
                    { label: 'Servicos', valor: porCategoria.servico, cor: '#10b981' },
                    { label: 'Outros', valor: porCategoria.outros, cor: '#8b5cf6' },
                  ].filter(x => x.valor > 0).map(x => (
                    <div key={x.label} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: x.cor }} />
                      <span className="text-xs text-muted-foreground flex-1">{x.label}</span>
                      <span className="text-xs font-semibold">{((x.valor / totalGraf) * 100).toFixed(0)}%</span>
                      <span className="text-xs text-muted-foreground">{fmt(x.valor)}</span>
                    </div>
                  ))}
                  <div className="pt-1 border-t border-border flex justify-between">
                    <span className="text-[10px] text-muted-foreground">{equipamentos.length} equipamento(s) · {itens.length} itens</span>
                    <span className="text-xs font-bold" style={{ color: cor }}>{fmt(totais.totalVenda)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Versao Loja — lista simples de materiais */}
          {versao === 'loja' && (
            <div className="rounded-xl border border-emerald-600/30 bg-emerald-600/5 p-4">
              <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold mb-3">Lista de Materiais para Cotacao</p>
              <div className="space-y-1.5">
                {itens.map((it, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-border/50">
                    <span className="text-muted-foreground w-5 text-right shrink-0">{i+1}.</span>
                    <span className="flex-1">{it.descricao}</span>
                    <span className="font-semibold text-emerald-400">{it.quantidade % 1 === 0 ? it.quantidade : it.quantidade.toFixed(2)} {it.unidade}</span>
                    <span className="text-muted-foreground w-24 text-right text-[10px]">____________</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 text-center">Exporte o PDF Loja para enviar ao fornecedor com os campos de preco em branco</p>
            </div>
          )}

          {/* Cliente */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">Cliente</p>
            <p className="font-semibold">{clienteNome || '—'}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
              {clienteTelefone && <p className="text-sm text-muted-foreground">{clienteTelefone}</p>}
              {clienteEndereco && <p className="text-sm text-muted-foreground">{clienteEndereco}</p>}
            </div>
          </div>

          {/* Equipamentos — cards com borda lateral colorida */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2" style={{ background: `${cor}10` }}>
              <span className="w-1 h-4 rounded-full shrink-0" style={{ background: cor }} />
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: cor }}>Equipamentos</p>
              <span className="ml-auto text-[10px] text-muted-foreground">{equipamentos.length} un.</span>
            </div>
            <div className="p-3 space-y-2">
              {equipamentos.map(eq => {
                const eqItens = itens.filter(i => i.equipamentoId === eq.id)
                const totalVendaEq = eqItens.reduce((s, i) => s + i.precoVenda * i.quantidade, 0)
                const totalCustoEq = eqItens.reduce((s, i) => s + i.precoCusto * i.quantidade, 0)
                const matItens = eqItens.filter(i => i.categoria === 'material')
                const svcItens = eqItens.filter(i => i.categoria === 'servico')
                return (
                  <div key={eq.id} className="rounded-xl border border-border overflow-hidden" style={{ borderLeft: `3px solid ${cor}` }}>
                    <div className="flex justify-between items-start gap-2 p-3">
                      <div className="min-w-0">
                        <p className="font-bold text-sm leading-tight">{eq.marca} {rotuloTipo(eq.tipo)} &mdash; {formatarBtu(eq.btu)} <span className="text-muted-foreground font-normal">× {eq.quantidade}</span></p>
                        <p className="text-xs text-muted-foreground mt-0.5">{eq.ambiente} · {eq.tensao} · {eq.distanciaTubulacao}m</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm" style={{ color: cor }}>{fmt(totalVendaEq)}</p>
                        {versao === 'interna' && subInterna === 'com-custo' && (
                          <p className="text-[10px] text-amber-500 mt-0.5">custo: {fmt(totalCustoEq)}</p>
                        )}
                      </div>
                    </div>
                    {/* Itens do equipamento agrupados */}
                    {(versao === 'interna') && eqItens.length > 0 && (
                      <div className="border-t border-border/50 bg-muted/20">
                        {[
                          { label: 'Materiais', lista: matItens, cor2: cor },
                          { label: 'Servicos', lista: svcItens, cor2: '#10b981' },
                        ].filter(g => g.lista.length > 0).map(g => (
                          <div key={g.label} className="px-3 py-2">
                            <p className="text-[9px] uppercase tracking-wider font-semibold mb-1" style={{ color: g.cor2 }}>{g.label}</p>
                            {g.lista.map((item, i) => (
                              <div key={i} className="flex justify-between items-center py-0.5 text-[11px]">
                                <span className="text-muted-foreground truncate max-w-[55%]">{item.descricao} <span className="opacity-60">×{item.quantidade}</span></span>
                                <div className="flex gap-2 shrink-0 ml-2">
                                  {subInterna === 'com-custo' && <span className="text-amber-500/70">{fmt(item.precoCusto * item.quantidade)}</span>}
                                  <span className="font-medium" style={{ color: g.cor2 }}>{fmt(item.precoVenda * item.quantidade)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Lista de material — colapsavel, com alternancia lista/icones (nao aparece na versao loja, que ja tem a propria lista) */}
          {versao !== 'loja' && itens.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5">
                <button
                  onClick={() => setMateriaisAbertos(v => !v)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  <ChevronDown size={14} className={cn('transition-transform text-muted-foreground', materiaisAbertos && 'rotate-180')} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cor }}>Lista de material</span>
                  <span className="text-[10px] text-muted-foreground">{itens.length} itens</span>
                </button>
                {materiaisAbertos && (
                  <div className="flex rounded-md border border-border overflow-hidden shrink-0">
                    <button
                      onClick={() => setModoLista('lista')}
                      className={cn('p-1.5', modoLista === 'lista' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground')}
                      aria-label="Ver em lista"
                    ><List size={13} /></button>
                    <button
                      onClick={() => setModoLista('icones')}
                      className={cn('p-1.5', modoLista === 'icones' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground')}
                      aria-label="Ver em ícones"
                    ><LayoutGrid size={13} /></button>
                  </div>
                )}
              </div>

              {materiaisAbertos && (
                <div className="border-t border-border p-3">
                  {modoLista === 'lista' ? (
                    <div className="space-y-1">
                      {itens.map((it, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-b border-border/40 last:border-0">
                          <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0" style={{ color: cor }}>
                            {iconeItem(it, 13)}
                          </span>
                          <span className="flex-1 min-w-0 truncate">{it.descricao}</span>
                          <span className="text-muted-foreground shrink-0">{it.quantidade % 1 === 0 ? it.quantidade : it.quantidade.toFixed(1)} {it.unidade}</span>
                          {versao !== 'cliente-servico' && <span className="font-semibold shrink-0 w-20 text-right" style={{ color: cor }}>{fmt(it.precoVenda)}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {itens.map((it, i) => (
                        <div key={i} className="rounded-xl border border-border bg-background p-2.5 flex flex-col gap-1">
                          <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${cor}15`, color: cor }}>
                            {iconeItem(it, 18)}
                          </span>
                          <p className="text-[11px] leading-tight line-clamp-2 min-h-[28px]">{it.descricao}</p>
                          <div className="flex items-center justify-between mt-auto pt-1">
                            <span className="text-[10px] text-muted-foreground">{it.quantidade % 1 === 0 ? it.quantidade : it.quantidade.toFixed(1)} {it.unidade}</span>
                            {versao !== 'cliente-servico' && <span className="text-[11px] font-semibold" style={{ color: cor }}>{fmt(it.precoVenda)}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Totais */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {versao === 'interna' && (
              <div className={cn('grid gap-2', subInterna === 'com-custo' ? 'grid-cols-3' : 'grid-cols-2')}>
                {subInterna === 'com-custo' && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <p className="text-[9px] text-amber-600 uppercase tracking-wide mb-0.5">Custo</p>
                    <p className="text-sm font-bold text-amber-500">{fmt(totais.totalCusto)}</p>
                  </div>
                )}
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-[9px] text-emerald-600 uppercase tracking-wide mb-0.5">Lucro</p>
                  <p className="text-sm font-bold text-emerald-500">{fmt(totais.lucro)}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-[9px] text-emerald-600 uppercase tracking-wide mb-0.5">Margem</p>
                  <p className="text-sm font-bold text-emerald-500">{totais.margemLucro.toFixed(1)}%</p>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center p-3 rounded-xl" style={{ background: `${cor}15`, border: `1.5px solid ${cor}40` }}>
              <span className="font-bold uppercase tracking-wide text-xs">Total do Orcamento</span>
              <span className="text-xl font-bold" style={{ color: cor }}>{fmt(totais.totalVenda)}</span>
            </div>
          </div>

          {/* Observacoes */}
          {observacoes && (
            <div className="rounded-xl p-4 text-sm text-muted-foreground" style={{ borderLeft: `3px solid ${cor}`, background: `${cor}08` }}>
              <p className="font-semibold text-foreground mb-1 text-[10px] uppercase tracking-wide">Observacoes</p>
              <p className="leading-relaxed whitespace-pre-wrap">{observacoes}</p>
            </div>
          )}

          {/* Exportacao — 3 destinos claros: Cliente, Loja/Fornecedor e Uso Interno */}
          <div className="space-y-3 pb-6">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1">Para quem é este PDF?</p>

            {/* ── CLIENTE ── */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border" style={{ background: `${cor}10` }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${cor}22`, color: cor }}>
                  <UserRound size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">Para o Cliente</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Proposta comercial com valores</p>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-border">
                <button
                  onClick={() => exportarPDF('cliente')}
                  className="flex flex-col items-center gap-1 py-3 hover:bg-accent transition-colors"
                >
                  <Package size={16} style={{ color: cor }} />
                  <span className="text-xs font-medium">Completo</span>
                  <span className="text-[10px] text-muted-foreground">Com materiais</span>
                </button>
                <button
                  onClick={() => exportarPDF('cliente-servico')}
                  className="flex flex-col items-center gap-1 py-3 hover:bg-accent transition-colors"
                >
                  <Wrench size={16} style={{ color: cor }} />
                  <span className="text-xs font-medium">Só o serviço</span>
                  <span className="text-[10px] text-muted-foreground">Só mão de obra</span>
                </button>
              </div>
            </div>

            {/* ── LOJA / FORNECEDOR ── */}
            <button
              onClick={() => exportarPDF('loja')}
              className="w-full rounded-xl border border-emerald-600/40 bg-emerald-600/5 hover:bg-emerald-600/10 transition-colors flex items-center gap-2.5 px-4 py-3 text-left"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-600/20 text-emerald-500 flex items-center justify-center shrink-0">
                <Store size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight text-emerald-500">Para a Loja / Fornecedor</p>
                <p className="text-[11px] text-muted-foreground leading-tight">Só quantidades — sem valores, p/ cotação</p>
              </div>
              <Download size={14} className="text-emerald-500/70 shrink-0" />
            </button>

            {/* ── USO INTERNO ── */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-amber-500/20">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <Calculator size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight text-amber-500">Relatório Interno</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Lucro por item e por operação — só p/ você</p>
                </div>
                <Lock size={12} className="text-amber-500/50 shrink-0 ml-auto" />
              </div>
              <div className="grid grid-cols-2 divide-x divide-amber-500/20">
                <button
                  onClick={() => exportarPDF('interna')}
                  className="flex flex-col items-center gap-1 py-3 text-amber-500 hover:bg-amber-500/10 transition-colors"
                >
                  <HandCoins size={16} />
                  <span className="text-xs font-medium">A preço de custo</span>
                  <span className="text-[10px] text-amber-500/60">Custo + venda + lucro</span>
                </button>
                <button
                  onClick={() => exportarPDF('interna-sem-custo')}
                  className="flex flex-col items-center gap-1 py-3 text-amber-500 hover:bg-amber-500/10 transition-colors"
                >
                  <TrendingUp size={16} />
                  <span className="text-xs font-medium">A preço de venda</span>
                  <span className="text-[10px] text-amber-500/60">Lucro + margem</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TotalRow({ label, valor, bold, dim, cor }: { label: string; valor: string; bold?: boolean; dim?: boolean; cor?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className={cn('text-sm', dim ? 'text-muted-foreground' : bold ? 'font-bold' : '')}>{label}</span>
      <span
        className={cn('text-sm', bold ? 'text-lg font-bold' : dim ? 'text-muted-foreground' : '')}
        style={cor ? { color: cor } : undefined}
      >
        {valor}
      </span>
    </div>
  )
}

// ─── DONUT CHART SVG ─────────────────────────────────────────────────────────
function DonutChart({ servico, material, outros, total, cor }: {
  servico: number; material: number; outros: number; total: number; cor: string
}) {
  const R = 36, cx = 44, cy = 44, stroke = 10
  const circ = 2 * Math.PI * R
  const pcts = [
    { val: material, cor },
    { val: servico, cor: '#10b981' },
    { val: outros, cor: '#8b5cf6' },
  ]
  let offset = 0
  const arcs = pcts.map(p => {
    const dash = (p.val / total) * circ
    const arc = { dash, offset, cor: p.cor }
    offset += dash
    return arc
  })
  return (
    <svg width={88} height={88} viewBox="0 0 88 88">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      {arcs.map((a, i) => (
        <circle
          key={i} cx={cx} cy={cy} r={R} fill="none"
          stroke={a.cor} strokeWidth={stroke}
          strokeDasharray={`${a.dash} ${circ - a.dash}`}
          strokeDashoffset={circ / 4 - a.offset}
          strokeLinecap="butt"
        />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={8} fill="#94a3b8">Total</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize={7} fontWeight="700" fill="#f1f5f9">
        {(total / 1000).toFixed(1)}k
      </text>
    </svg>
  )
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────��───
export function NovoOrcamento({
  ollamaOnline,
  estadoInicial,
  onEstadoChange,
  orcamentoParaEditar,
  edicaoNonce,
}: {
  ollamaOnline: boolean
  estadoInicial?: EstadoChat | null
  onEstadoChange?: (estado: EstadoChat) => void
  orcamentoParaEditar?: Orcamento | null
  edicaoNonce?: number
}) {
  const perfil = carregarPerfil()
  // Provedor de IA: 'nuvem' (Gemini, padrão) ou 'local' (Ollama no PC)
  const provedor = perfil.provedorIA ?? 'nuvem'
  const isNuvem = provedor === 'nuvem'

  const MENSAGEM_INICIAL: MensagemChat = {
    role: 'assistant',
      content: `Pode falar! Diga o cliente, os equipamentos, marca, BTU e distancia de tubulacao — tudo de uma vez se quiser. Ja monto o orcamento na hora.`,
    timestamp: new Date(),
  }

  // Estado do chat — restaura do pai se existir
  const [mensagens, setMensagens] = useState<MensagemChat[]>(
    estadoInicial?.mensagens ?? [MENSAGEM_INICIAL]
  )
  const [equipamentos, setEquipamentos] = useState<EquipamentoOrcamento[]>(
    estadoInicial?.equipamentos ?? []
  )
  const [itens, setItens] = useState<ItemOrcamento[]>(estadoInicial?.itens ?? [])
  // Itens extras (materiais/serviços avulsos adicionados via chat) — sobrevivem à regeneração
  const [itensExtras, setItensExtras] = useState<ItemOrcamento[]>([])
  // Descrições de itens gerados pelo equipamento que o técnico pediu para REMOVER via chat (agente operacional)
  const [descricoesRemovidas, setDescricoesRemovidas] = useState<string[]>([])
  // Itens removidos MANUALMENTE pelo técnico (botão de excluir nas abas). Chave exata por item — não usa
  // correspondência difusa, então excluir um "Cabo" não apaga os outros cabos. Sobrevive à regeneração.
  const [chavesRemovidas, setChavesRemovidas] = useState<string[]>([])
  // Desconto aplicado ao orçamento: por percentual (%) ou por valor fixo (R$)
  const [desconto, setDesconto] = useState<{ tipo: 'percentual' | 'valor'; valor: number }>({ tipo: 'percentual', valor: 0 })
  // Ajustes manuais dos itens gerados (qtd/preço) — sobrevivem à regeneração. Chave estável por item.
  const [ajustesItens, setAjustesItens] = useState<Record<string, { quantidade?: number; precoVenda?: number; precoCusto?: number }>>({})
  const [totais, setTotais] = useState(
    estadoInicial
      ? calcularTotais(estadoInicial.itens)
      : { totalCusto: 0, totalVenda: 0, lucro: 0, margemLucro: 0 }
  )
  const [clienteNome, setClienteNome] = useState(estadoInicial?.clienteNome ?? '')
  const [clienteEndereco, setClienteEndereco] = useState(estadoInicial?.clienteEndereco ?? '')
  const [clienteTelefone, setClienteTelefone] = useState(estadoInicial?.clienteTelefone ?? '')
  // Cliente do cadastro central vinculado a este orçamento (opcional)
  const [clienteVinculadoId, setClienteVinculadoId] = useState<string | null>(null)
  const [observacoes, setObservacoes] = useState(estadoInicial?.observacoes ?? '')
  const [orcamentoSalvo, setOrcamentoSalvo] = useState<Orcamento | null>(estadoInicial?.orcamentoSalvo ?? null)

  const [inputChat, setInputChat] = useState('')
  const [gravando, setGravando] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [modoVisualizacao, setModoVisualizacao] = useState<'venda' | 'custo'>('venda')
  const [mostrarPreview, setMostrarPreview] = useState(false)

  const [silencioContador, setSilencioContador] = useState(0) // segundos restantes no countdown
  const chatEndRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const silencioTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const silencioInicioRef = useRef<number | null>(null)
  const silencioRafRef = useRef<number | null>(null)
  const textoAcumuladoRef = useRef<string>('')
  const textoBaseRef = useRef<string>('') // texto já confirmado de sessões anteriores desta gravação
  const pararIntencionalRef = useRef<boolean>(false) // distingue parada real de reinício automático (mobile)
  // Sempre aponta para a última versão de enviarMensagemTexto (evita closure velha no envio por voz)
  const enviarRef = useRef<(t: string) => void>(() => {})
  const SILENCIO_LIMITE_MS = 7000

  // Recarrega o chat com um orçamento vindo do Histórico ("Editar no chat").
  // Dispara SÓ quando edicaoNonce muda — nunca na sincronização normal de estado,
  // para não zerar um orçamento em andamento ao trocar de aba.
  useEffect(() => {
    if (!edicaoNonce || !orcamentoParaEditar) return
    const orc = orcamentoParaEditar
    setMensagens([{
      role: 'assistant',
      content: `Abri o orçamento ${orc.numero} para edição. Me diga o que quer mudar — ex: "troca o 1 para 12000 BTU", "adiciona uma limpeza", "tira o disjuntor".`,
      timestamp: new Date(),
    }])
    setEquipamentos(orc.equipamentos ?? [])
    setItensExtras([])
    setDescricoesRemovidas([])
    setChavesRemovidas([])
    setAjustesItens({})
    setDesconto({ tipo: 'percentual', valor: 0 })
    setClienteNome(orc.clienteNome ?? '')
    setClienteEndereco(orc.clienteEndereco ?? '')
    setClienteTelefone(orc.clienteTelefone ?? '')
    setObservacoes(orc.observacoes ?? '')
    setOrcamentoSalvo(orc)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicaoNonce])

  // Sincroniza estado para o pai (persiste entre abas)
  useEffect(() => {
    onEstadoChange?.({
      mensagens, equipamentos, itens, clienteNome, clienteEndereco, clienteTelefone, observacoes, orcamentoSalvo,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagens, equipamentos, itens, clienteNome, clienteEndereco, clienteTelefone, observacoes, orcamentoSalvo])

  // Rolar ao fim do chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, processando])

  // Recalcular itens = itens dos equipamentos + itens extras (materiais avulsos)
  useEffect(() => {
    const todosItens: ItemOrcamento[] = []
    equipamentos.forEach(eq => todosItens.push(...gerarItensEquipamento(eq, perfil)))
    // Remove os itens de instalação que o técnico pediu para tirar via chat (agente operacional)
    // e os que ele excluiu manualmente pelo botão nas abas (chave exata).
    const gerFiltrados = todosItens.filter(it => {
      if (chavesRemovidas.includes(chaveItem(it))) return false
      if (descricoesRemovidas.some(rem => itemCasaComAlvo(it.descricao, rem))) return false
      return true
    })
    // Aplica ajustes manuais (qtd/preço editados na mão) por chave estável
    const comAjustes = gerFiltrados.map(it => {
      const aj = ajustesItens[chaveItem(it)]
      if (!aj) return it
      const q = aj.quantidade ?? it.quantidade
      return {
        ...it,
        quantidade: q,
        precoVenda: aj.precoVenda ?? it.precoVenda,
        precoCusto: aj.precoCusto ?? it.precoCusto,
      }
    })
    const combinados = [...comAjustes, ...itensExtras]
    const totaisBase = calcularTotais(combinados)

    // Desconto: reduz o total de venda (e o lucro). Nunca deixa negativo.
    const valorDesconto = desconto.valor <= 0
      ? 0
      : desconto.tipo === 'percentual'
        ? Math.min(totaisBase.totalVenda, totaisBase.totalVenda * (desconto.valor / 100))
        : Math.min(totaisBase.totalVenda, desconto.valor)

    const itensFinais = valorDesconto > 0
      ? [...combinados, {
          id: 'desconto-global',
          descricao: desconto.tipo === 'percentual' ? `Desconto (${desconto.valor}%)` : 'Desconto',
          quantidade: 1, unidade: 'un',
          precoCusto: 0, precoVenda: -valorDesconto,
          categoria: 'outros' as const,
        }]
      : combinados

    setItens(itensFinais)
    setTotais(calcularTotais(itensFinais))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipamentos, itensExtras, descricoesRemovidas, chavesRemovidas, ajustesItens, desconto])

  // ── Para gravacao e limpa recursos ───────────────────────────────────────
  const pararGravacao = useCallback((enviar = true) => {
    // Sinaliza que a parada é intencional (para o onend não reiniciar)
    pararIntencionalRef.current = true
    // Para o recognition e REMOVE os handlers para que o onend antigo não reinicie
    // uma sessão nova (bug que impedia gravar pela 2ª vez).
    const recAtual = recognitionRef.current
    if (recAtual) {
      recAtual.onend = null
      recAtual.onresult = null
      recAtual.onerror = null
      try { recAtual.stop() } catch { /* já parado */ }
      try { recAtual.abort?.() } catch { /* ignore */ }
    }
    recognitionRef.current = null
    // Para o timer de silêncio
    if (silencioRafRef.current) cancelAnimationFrame(silencioRafRef.current)
    if (silencioTimerRef.current) clearInterval(silencioTimerRef.current)
    silencioTimerRef.current = null
    silencioInicioRef.current = null
    setSilencioContador(0)
    setGravando(false)

    if (enviar) {
      const texto = textoAcumuladoRef.current.trim()
      textoAcumuladoRef.current = ''
      textoBaseRef.current = ''
      if (texto) {
        setInputChat(texto)
        // Usa a referência mais recente — nunca uma closure velha (senão a IA
        // recebe contexto vazio e "não executa" o que foi pedido por voz).
        setTimeout(() => enviarRef.current(texto), 50)
      }
    } else {
      textoAcumuladoRef.current = ''
      textoBaseRef.current = ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Voz com detecção de silêncio (7s) ────────────────────────────────────
  // IMPORTANTE: NÃO usamos getUserMedia/AudioContext aqui. No iOS o SpeechRecognition
  // e o getUserMedia disputam o microfone — o que fazia o sinal "travar" após a 1ª fala.
  // O silêncio é detectado só pelos eventos do próprio reconhecimento.
  const toggleGravacao = useCallback(async () => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setErro('Navegador nao suporta voz. Use Chrome ou Safari.')
      return
    }

    // Se ja esta gravando, para e envia
    if (gravando) { pararGravacao(true); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SRClass = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    textoAcumuladoRef.current = ''
    textoBaseRef.current = ''
    pararIntencionalRef.current = false
    silencioInicioRef.current = Date.now()

    // Qualquer atividade de voz reinicia o contador de silêncio
    const marcarFala = () => {
      silencioInicioRef.current = Date.now()
      setSilencioContador(0)
    }

    // Monta uma instância NOVA de reconhecimento. No iOS Safari não dá para
    // reiniciar a mesma instância — por isso cada reinício automático cria uma nova.
    const montarRec = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rec: any = new SRClass()
      rec.lang = 'pt-BR'
      rec.continuous = true
      rec.interimResults = true  // eventos frequentes -> silêncio suave, sem AudioContext

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (e: any) => {
        marcarFala()
        // Monta só o texto FINAL desta sessão (interim serve só para resetar o silêncio)
        let finalTxt = ''
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalTxt += e.results[i][0].transcript + ' '
        }
        finalTxt = finalTxt.trim()
        if (finalTxt) {
          textoAcumuladoRef.current = (textoBaseRef.current + ' ' + finalTxt).trim()
          setInputChat(textoAcumuladoRef.current)
        }
      }
      rec.onspeechstart = marcarFala
      rec.onerror = (ev: { error?: string }) => {
        // "no-speech"/"aborted" são recuperáveis — o onend cria uma nova sessão
        if (ev?.error === 'no-speech' || ev?.error === 'aborted') return
        if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
          setErro('Permissao de microfone negada. Ative o microfone para este site.')
          pararGravacao(false)
          return
        }
        pararGravacao(false)
      }
      rec.onend = () => {
        // Só reinicia se ESTA ainda for a sessão ativa e a parada não foi intencional
        if (recognitionRef.current !== rec || pararIntencionalRef.current) return
        // Confirma o que foi dito e abre uma NOVA sessão (fresca) para continuar ouvindo
        textoBaseRef.current = textoAcumuladoRef.current
        const novo = montarRec()
        recognitionRef.current = novo
        try { novo.start() } catch { /* ignore */ }
      }
      return rec
    }

    const rec = montarRec()
    recognitionRef.current = rec
    try {
      rec.start()
    } catch {
      setErro('Nao foi possivel iniciar o microfone. Tente novamente.')
      return
    }
    setGravando(true)
    setSilencioContador(0)

    // Detecção de silêncio por timer: se ficar SILENCIO_LIMITE_MS sem nenhum
    // evento de voz, para e envia automaticamente.
    silencioTimerRef.current = setInterval(() => {
      if (silencioInicioRef.current === null) return
      const decorrido = Date.now() - silencioInicioRef.current
      const restante = Math.ceil((SILENCIO_LIMITE_MS - decorrido) / 1000)
      setSilencioContador(Math.max(0, restante))
      if (decorrido >= SILENCIO_LIMITE_MS) pararGravacao(true)
    }, 300)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gravando, pararGravacao])

  // ── Aplicar ação da IA ────────────────────────────────────────────────────
  const aplicarAcao = useCallback((acao: IAAcao) => {
    if (acao.clienteNome)     setClienteNome(acao.clienteNome)
    if (acao.clienteEndereco) setClienteEndereco(acao.clienteEndereco)
    if (acao.clienteTelefone) setClienteTelefone(acao.clienteTelefone)
    if (acao.observacoes)     setObservacoes(acao.observacoes)

    // Ação "limpar" — zera tudo explicitamente. O useEffect cuida de itens/totais.
    if (acao.acao === 'limpar') {
      setItensExtras([])
      setEquipamentos([])
      setDescricoesRemovidas([])
      return
    }

    // Monta a lista de equipamentos que a IA mandou
    const novos: EquipamentoOrcamento[] = []
    for (const e of (acao.equipamentos ?? [])) {
      const eq = montarEquipamento({
        marca: e.marca ?? '', tipo: (e.tipo as EquipamentoOrcamento['tipo']) ?? 'hi-wall',
        btu: e.btu ?? 12000, quantidade: e.quantidade ?? 1,
        ambiente: e.ambiente ?? 'Ambiente 1', distancia: e.distanciaTubulacao ?? 4,
        tensao: ((e.tensao as '110V' | '220V') ?? '220V'),
      })
      if (eq) novos.push(eq)
    }

    // Atualiza equipamentos — o useEffect [equipamentos] regenera itens e totais.
    if (acao.acao === 'adicionar') {
      // Adiciona aos existentes SEM apagar (equipamentos pode vir vazio se for só item extra)
      if (novos.length > 0) setEquipamentos(prev => [...prev, ...novos])
    } else if (acao.acao === 'atualizar_orcamento') {
      // Substitui a lista completa — só se a IA mandou equipamentos.
      // Se veio vazio (ex: só quer mexer em item extra), NÃO apaga os atuais.
      if (novos.length > 0) setEquipamentos(novos)
    }

    // Processa itens extras (materiais/custos avulsos) — estado separado, sobrevive à regeneração
    if (acao.itensExtras && acao.itensExtras.length > 0) {
      const removes = acao.itensExtras.filter(e => e._op === 'remove')
      const adds = acao.itensExtras.filter(e => e._op !== 'remove')

      setItensExtras(prev => {
        let lista = [...prev]
        for (const extra of removes) {
          lista = lista.filter(it => !itemCasaComAlvo(it.descricao, extra.descricao))
        }
        for (const extra of adds) {
          lista = [...lista, {
            id: `extra-${crypto.randomUUID()}`,
            descricao: extra.descricao,
            quantidade: extra.quantidade ?? 1,
            unidade: extra.unidade ?? 'un',
            precoCusto: extra.precoCusto ?? 0,
            precoVenda: extra.precoVenda ?? 0,
            categoria: extra.categoria ?? 'outros',
          }]
        }
        return lista
      })

      // Agente operacional: remoções também escondem itens gerados pelo equipamento (ex: "tira o disjuntor").
      // Adições da mesma descrição "des-removem" (técnico readicionou o item).
      if (removes.length > 0 || adds.length > 0) {
        setDescricoesRemovidas(prev => {
          let lista = [...prev]
          for (const r of removes) if (!lista.includes(r.descricao)) lista.push(r.descricao)
          for (const a of adds) lista = lista.filter(d => !itemCasaComAlvo(a.descricao, d) && !itemCasaComAlvo(d, a.descricao))
          return lista
        })
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Enviar mensagem ───────────────────────────────────────────────────────
  const enviarMensagemTexto = async (texto: string) => {
    if (!texto.trim()) return

    // Verifica status em tempo real antes de enviar (evita falsos negativos do cache)
    let iaOnline = isNuvem ? true : ollamaOnline
    if (!iaOnline) {
      try {
        const check = await fetch(`/api/ollama?provedor=${provedor}`)
        const data = await check.json()
        iaOnline = data.online ?? false
      } catch {
        iaOnline = false
      }
    }
    if (!iaOnline) { setErro('IA offline. Verifique se o Ollama e o ngrok estao rodando no seu PC.'); return }

    setErro('')
    const novaMensagem: MensagemChat = { role: 'user', content: texto, timestamp: new Date() }
    setMensagens(prev => {
      const atualizado = [...prev, novaMensagem]
      return atualizado
    })
    setInputChat('')
    setProcessando(true)

    const historicoAPI = [...mensagens, novaMensagem].map(m => ({ role: m.role, content: m.content }))

    // Serializa estado atual para a IA ter contexto do orcamento
    const estadoAtual = (equipamentos.length > 0 || itensExtras.length > 0) ? {
      equipamentos: equipamentos.map((eq, i) => ({
        indice: i + 1,
        marca: eq.marca, tipo: eq.tipo, btu: eq.btu,
        quantidade: eq.quantidade, ambiente: eq.ambiente,
        distanciaTubulacao: eq.distanciaTubulacao, tensao: eq.tensao,
      })),
      itensExtras: itensExtras.map((it, i) => ({
        indice: i + 1,
        descricao: it.descricao, quantidade: it.quantidade,
        unidade: it.unidade, precoCusto: it.precoCusto,
        precoVenda: it.precoVenda, categoria: it.categoria,
      })),
      clienteNome,
      clienteEndereco,
      clienteTelefone,
    } : null

    try {
      const body = JSON.stringify({
        mensagem: texto,
        historico: historicoAPI.slice(0, -1),
        estadoAtual,
        provedor,
      })

      // Tenta até 2 vezes com timeout de 60s cada
      let resp: Response | null = null
      let tentativa = 0
      while (tentativa < 2) {
        try {
          resp = await fetch('/api/ollama/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal: AbortSignal.timeout(60000),
          })
          break
        } catch (fetchErr) {
          tentativa++
          if (tentativa >= 2) throw fetchErr
          // Aguarda 1s antes de tentar de novo
          await new Promise(r => setTimeout(r, 1000))
        }
      }

      if (!resp) throw new Error('Sem resposta do servidor')

      const data = await resp.json()
      // Bloqueio de licença: NÃO faz fallback local (evita burlar o limite)
      if (resp.status === 402) {
        const msgErro = data.erro ?? 'Assinatura necessária para usar a IA.'
        setMensagens(prev => [...prev, { role: 'assistant', content: msgErro, timestamp: new Date() }])
        setErro(msgErro)
        return
      }
      if (!resp.ok || data.erro) {
        const msgErro = data.erro ?? 'Erro ao processar com a IA.'
        // Mesmo com erro da IA, tenta parser local para não perder o orçamento
        const acaoLocal = parsearTextoLocalmente(texto)
        if (acaoLocal) {
          aplicarAcao(acaoLocal)
          setMensagens(prev => [...prev, { role: 'assistant', content: acaoLocal.mensagem ?? 'Orçamento atualizado.', timestamp: new Date() }])
        } else {
          setMensagens(prev => [...prev, { role: 'assistant', content: `Erro: ${msgErro}`, timestamp: new Date() }])
          setErro(msgErro)
        }
        return
      }

      setMensagens(prev => [...prev, { role: 'assistant', content: data.texto || 'Orçamento atualizado.', timestamp: new Date() }])
      if (data.acao) {
        aplicarAcao(data.acao as IAAcao)
      } else {
        // IA respondeu em texto sem JSON — tenta parser local como fallback
        const acaoLocal = parsearTextoLocalmente(texto)
        if (acaoLocal && acaoLocal.equipamentos && acaoLocal.equipamentos.length > 0) {
          aplicarAcao(acaoLocal)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro de conexao'
      // Mesmo com erro de rede, tenta parser local para o usuario nao perder o trabalho
      const acaoLocal = parsearTextoLocalmente(texto)
      if (acaoLocal && acaoLocal.equipamentos && acaoLocal.equipamentos.length > 0) {
        aplicarAcao(acaoLocal)
        setMensagens(prev => [...prev, { role: 'assistant', content: '(Processado localmente) ' + (acaoLocal.mensagem ?? 'Orçamento atualizado.'), timestamp: new Date() }])
      } else {
        setMensagens(prev => [...prev, { role: 'assistant', content: `IA indisponivel: ${msg}. Verifique ngrok e Ollama.`, timestamp: new Date() }])
        setErro(msg)
      }
    } finally {
      setProcessando(false)
    }
  }

  // Mantém a ref sempre com a versão mais recente (usada pelo envio por voz)
  enviarRef.current = enviarMensagemTexto

  const enviarMensagem = () => enviarMensagemTexto(inputChat.trim())

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  // ── Salvar ────────────────────────────────────────────────────────────────
  const salvar = async () => {
    if (equipamentos.length === 0 && itensExtras.length === 0) { setErro('Adicione pelo menos um item (equipamento, serviço ou material).'); return }
    setSalvando(true)
    const todos = carregarOrcamentos()
    const validade = new Date()
    validade.setDate(validade.getDate() + perfil.validadeOrcamentoDias)
    const orc: Orcamento = {
      id: crypto.randomUUID(),
      numero: gerarNumeroOrcamento(todos),
      dataCriacao: new Date().toISOString(),
      validade: validade.toISOString(),
      status: 'rascunho',
      clienteNome, clienteEndereco, clienteTelefone,
      equipamentos, itens, ...totais,
      observacoes: observacoes || perfil.observacoesPadrao.replace('{validade}', String(perfil.validadeOrcamentoDias)),
      prompt: mensagens.filter(m => m.role === 'user').map(m => m.content).join(' | '),
    }
    // Fonte de verdade + bloqueio real do limite mensal: grava no banco
    let dbRes: { ok: boolean; mensagem?: string; id?: string }
    try {
      dbRes = await salvarOrcamentoDB({
        id: orc.id,
        clienteId: clienteVinculadoId ?? undefined,
        clienteNome: orc.clienteNome,
        clienteEndereco: orc.clienteEndereco,
        clienteTelefone: orc.clienteTelefone,
        observacoes: orc.observacoes,
        equipamentos: orc.equipamentos,
        itens: orc.itens,
        totalCusto: orc.totalCusto,
        totalVenda: orc.totalVenda,
      })
    } catch {
      dbRes = { ok: false, mensagem: 'Erro de conexão ao salvar. Tente novamente.' }
    }
    if (!dbRes.ok) { setSalvando(false); setErro(dbRes.mensagem ?? 'Erro ao salvar.'); return }

    // Espelha no dispositivo (histórico/dashboard leem daqui)
    salvarOrcamento(orc)
    setSalvando(false)
    setOrcamentoSalvo(orc)
    setSucesso(`Orcamento ${orc.numero} salvo!`)
  }

  // Vincula um cliente do cadastro central: preenche os campos e guarda o id
  const vincularCliente = (c: { id: string; nome: string; telefone: string; endereco: string } | null) => {
    if (!c) { setClienteVinculadoId(null); return }
    setClienteVinculadoId(c.id)
    setClienteNome(c.nome)
    setClienteTelefone(c.telefone)
    if (c.endereco) setClienteEndereco(c.endereco)
  }

  const limpar = () => {
    setMensagens([{ ...MENSAGEM_INICIAL, timestamp: new Date() }])
    setEquipamentos([]); setItens([]); setItensExtras([]); setDescricoesRemovidas([]); setChavesRemovidas([])
    setAjustesItens({}); setDesconto({ tipo: 'percentual', valor: 0 })
    setClienteNome(''); setClienteEndereco(''); setClienteTelefone('')
    setClienteVinculadoId(null)
    setObservacoes(''); setErro(''); setSucesso('')
    setOrcamentoSalvo(null); setInputChat('')
    setMostrarPreview(false)
  }

  const temOrcamento = equipamentos.length > 0 || itensExtras.length > 0
  const [drawerAberto, setDrawerAberto] = useState(false)
  // Nonce que sinaliza ao painel para abrir direto na aba Preview (botao Exportar)
  const [irPreviewNonce, setIrPreviewNonce] = useState(0)

  // Drag do botão flutuante mobile
  const [btnPos, setBtnPos] = useState({ x: 0, y: 0 }) // offset em px do canto bottom-right
  const draggingRef = React.useRef(false)
  const startRef = React.useRef({ x: 0, y: 0, bx: 0, by: 0 })

  const onBtnPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true
    startRef.current = { x: e.clientX, y: e.clientY, bx: btnPos.x, by: btnPos.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onBtnPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    // Posiciona por 'left' (arrasta p/ direita = aumenta left) e 'bottom' (arrasta p/ cima = aumenta bottom)
    setBtnPos({ x: startRef.current.bx + dx, y: startRef.current.by - dy })
  }
  const onBtnPointerUp = (e: React.PointerEvent, cb: () => void) => {
    const dx = Math.abs(e.clientX - startRef.current.x)
    const dy = Math.abs(e.clientY - startRef.current.y)
    draggingRef.current = false
    // Só abre o drawer se foi um toque (sem arrastar)
    if (dx < 5 && dy < 5) cb()
  }

  // ── MODO PREVIEW ──────────────────────────────────────────────────────────
  if (mostrarPreview) {
    return (
      <PreviewOrcamento
        equipamentos={equipamentos} itens={itens} totais={totais}
        clienteNome={clienteNome} clienteEndereco={clienteEndereco}
        clienteTelefone={clienteTelefone} observacoes={observacoes}
        onVoltar={() => setMostrarPreview(false)}
        onSalvar={salvar} salvando={salvando} salvo={!!orcamentoSalvo}
      />
    )
  }

  // ── MODO CHAT ───────��──────────────────────────────���──────────────��───────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pl-14 pr-4 md:px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="min-w-0">
          <h1 className="text-base font-bold truncate">Novo Orcamento</h1>
          {clienteNome && (
            <p className="text-xs text-muted-foreground truncate">{clienteNome}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <IndicadorIALocal
            online={isNuvem ? true : ollamaOnline}
            model={isNuvem ? 'Gemini 2.5 Flash' : perfil.ollamaModel}
            url={isNuvem ? 'Vercel AI Gateway' : perfil.ollamaUrl}
            nuvem={isNuvem}
          />
          {temOrcamento && (
            <Button
              onClick={() => setMostrarPreview(true)}
              size="sm"
              className="gap-1.5 h-8 text-xs"
            >
              <Eye size={13} /> Visualizar
            </Button>
          )}
          {(temOrcamento || mensagens.length > 1) && (
            <button
              onClick={limpar}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Limpar tudo"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Corpo: chat + painel lateral */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── CHAT ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">

            {/* Atalhos rápidos — só quando chat vazio */}
            {mensagens.length === 1 && !processando && (
              <div className="px-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Zap size={10} /> Atalhos rapidos
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ATALHOS.map(a => (
                    <button
                      key={a}
                      onClick={() => enviarMensagemTexto(a)}
                      disabled={processando}
                      className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mensagens.map((msg, i) => (
              <div key={i} className={cn('flex gap-2.5', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  msg.role === 'assistant' ? 'bg-primary/20 text-primary' : 'bg-muted text-foreground'
                )}>
                  {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div className={cn('flex flex-col max-w-[80%] md:max-w-[72%]', msg.role === 'user' ? 'items-end' : 'items-start')}>
                  <div className={cn(
                    'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                    msg.role === 'assistant'
                      ? 'bg-card border border-border text-foreground rounded-tl-sm'
                      : 'bg-primary text-primary-foreground rounded-tr-sm'
                  )}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {horaFormatada(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {/* Indicador de processamento */}
            {processando && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                  <Bot size={14} />
                </div>
                <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm bg-card border border-border">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-xs text-muted-foreground ml-2 font-mono">{isNuvem ? 'Gemini 2.5 Flash' : perfil.ollamaModel}</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Notificacoes */}
          {erro && (
            <div className="mx-3 mb-2 flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
              <AlertCircle size={13} /> {erro}
              <button onClick={() => setErro('')} className="ml-auto opacity-60 hover:opacity-100">×</button>
            </div>
          )}
          {sucesso && (
            <div className="mx-3 mb-2 flex items-center gap-2 p-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-xs text-green-400">
              <CheckCircle size={13} /> {sucesso}
              <button onClick={() => setSucesso('')} className="ml-auto opacity-60 hover:opacity-100">×</button>
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-border flex-shrink-0 bg-background/50 backdrop-blur-sm">

            {/* Barra de status de gravação */}
            {gravando && (
              <div className="mb-2 flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-destructive/10 border border-destructive/30">
                {/* Ondas de áudio animadas */}
                <div className="flex items-end gap-0.5 h-5">
                  {[0.6, 1, 0.7, 1, 0.5].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 rounded-full bg-destructive"
                      style={{
                        height: `${h * 100}%`,
                        animation: `pulse ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                        opacity: silencioContador > 0 && silencioContador <= 3 ? 0.4 : 1,
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs text-destructive font-medium flex-1">
                  {silencioContador > 0 && silencioContador <= 3
                    ? `Silencio detectado — enviando em ${silencioContador}s...`
                    : 'Ouvindo... Fale o que precisar'}
                </span>
                {/* Countdown circular */}
                {silencioContador > 0 && silencioContador <= 3 && (
                  <span className="text-xs font-mono font-bold text-destructive w-6 text-center">
                    {silencioContador}
                  </span>
                )}
                <button
                  onClick={() => pararGravacao(true)}
                  className="text-[10px] text-destructive/80 hover:text-destructive underline"
                >
                  Enviar agora
                </button>
                <button
                  onClick={() => pararGravacao(false)}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                >
                  Cancelar
                </button>
              </div>
            )}

            <div className="flex gap-2 items-end">
              <button
                onClick={toggleGravacao}
                className={cn(
                  'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all border',
                  gravando
                    ? 'bg-destructive border-destructive text-white scale-110'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-accent'
                )}
                title={gravando ? 'Parar e enviar' : 'Gravar voz — para automatico apos 7s de silencio'}
              >
                {gravando ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <div className="flex-1">
                <Textarea
                  value={inputChat}
                  onChange={e => setInputChat(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    gravando
                      ? 'Transcrevendo fala...'
                      : ollamaOnline
                        ? 'Digite ou use o microfone — Enter envia'
                        : 'IA offline — verifique a conexao (status na barra lateral)'
                  }
                  className="min-h-[44px] max-h-36 resize-none text-sm py-2.5 leading-snug rounded-2xl"
                  disabled={processando}
                  rows={1}
                />
              </div>
              <Button
                onClick={gravando ? () => pararGravacao(true) : enviarMensagem}
                disabled={gravando ? false : (!inputChat.trim() || processando)}
                className={cn('w-11 h-11 p-0 rounded-2xl flex-shrink-0', gravando && 'bg-destructive hover:bg-destructive/90')}
              >
                {processando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </Button>
            </div>
            {!gravando && (
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                Microfone para automaticamente apos 7 segundos de silencio
              </p>
            )}
          </div>
        </div>

        {/* ── PAINEL LATERAL DESKTOP — sempre visivel ── */}
        <PainelLateral
          equipamentos={equipamentos}
          itens={itens}
          totais={totais}
          clienteNome={clienteNome}
          clienteEndereco={clienteEndereco}
          clienteTelefone={clienteTelefone}
          observacoes={observacoes}
          modoVisualizacao={modoVisualizacao}
          salvando={salvando}
          orcamentoSalvo={orcamentoSalvo}
          onEquipamentosChange={setEquipamentos}
          onItensChange={setItens}
          onClienteNomeChange={(v) => { setClienteNome(v); setClienteVinculadoId(null) }}
          onClienteEnderecoChange={setClienteEndereco}
          onClienteTelefoneChange={setClienteTelefone}
          clienteVinculadoId={clienteVinculadoId}
          onVincularCliente={vincularCliente}
          onModoVisualizacaoChange={setModoVisualizacao}
          onSalvar={salvar}
          itensExtras={itensExtras}
          onItensExtrasChange={setItensExtras}
          desconto={desconto}
          onDescontoChange={setDesconto}
          onAjustarItem={(it, campo, valor) =>
            setAjustesItens(prev => ({ ...prev, [chaveItem(it)]: { ...prev[chaveItem(it)], [campo]: valor } }))
          }
          onRemoverItens={(its) =>
            setChavesRemovidas(prev => Array.from(new Set([...prev, ...its.map(chaveItem)])))
          }
          irParaPreview={0}
        />

      </div>

      {/* ── BOTOES FLUTUANTES MOBILE (canto inferior esquerdo, longe do enviar) ── */}
      <div
        className="lg:hidden fixed z-40 flex items-center gap-2"
        style={{ bottom: `${btnPos.y + 152}px`, left: `${btnPos.x + 16}px` }}
      >
        {/* Orçamento — arrastavel, abre o painel de detalhes */}
        <button
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 text-sm font-semibold touch-none select-none cursor-grab active:cursor-grabbing"
          onPointerDown={onBtnPointerDown}
          onPointerMove={onBtnPointerMove}
          onPointerUp={e => onBtnPointerUp(e, () => setDrawerAberto(true))}
        >
          {equipamentos.length > 0
            ? <><Cpu size={15} /> {equipamentos.length} equip.</>
            : itensExtras.length > 0
              ? <><Wrench size={15} /> {itensExtras.length} {itensExtras.length === 1 ? 'item' : 'itens'}</>
              : <><Plus size={15} /> Orçamento</>
          }
          <ChevronUp size={14} />
        </button>

        {/* Exportar — verde, vai direto ao preview (so aparece se houver orcamento) */}
        {temOrcamento && (
          <button
            onClick={() => { setDrawerAberto(true); setIrPreviewNonce(n => n + 1) }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 text-sm font-semibold"
            aria-label="Exportar orçamento"
          >
            <Share2 size={15} /> Exportar
          </button>
        )}
      </div>

      {/* ── DRAWER MOBILE ── */}
      {drawerAberto && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerAberto(false)}
          />
          {/* Conteudo — usa dvh (altura real do celular) para nao ficar atras da barra de gestos */}
          <div className="relative bg-card rounded-t-2xl border-t border-border flex flex-col h-[90dvh]">
            {/* Handle + header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-1 rounded-full bg-border absolute top-2 left-1/2 -translate-x-1/2" />
                <span className="text-sm font-semibold mt-1">Detalhes do Orçamento</span>
              </div>
              <button
                onClick={() => setDrawerAberto(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <X size={16} />
              </button>
            </div>
            {/* Painel dentro do drawer — pb-safe garante que os botoes de baixo
                nao fiquem atras da barra de gestos do celular */}
            <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
              <PainelLateral
                equipamentos={equipamentos}
                itens={itens}
                totais={totais}
                clienteNome={clienteNome}
                clienteEndereco={clienteEndereco}
                clienteTelefone={clienteTelefone}
                observacoes={observacoes}
                modoVisualizacao={modoVisualizacao}
                salvando={salvando}
                orcamentoSalvo={orcamentoSalvo}
                onEquipamentosChange={setEquipamentos}
                onItensChange={setItens}
                onClienteNomeChange={setClienteNome}
                onClienteEnderecoChange={setClienteEndereco}
                onClienteTelefoneChange={setClienteTelefone}
                onModoVisualizacaoChange={setModoVisualizacao}
                onSalvar={salvar}
                itensExtras={itensExtras}
                onItensExtrasChange={setItensExtras}
                desconto={desconto}
                onDescontoChange={setDesconto}
                onAjustarItem={(it, campo, valor) =>
                  setAjustesItens(prev => ({ ...prev, [chaveItem(it)]: { ...prev[chaveItem(it)], [campo]: valor } }))
                }
                onRemoverItens={(its) =>
                  setChavesRemovidas(prev => Array.from(new Set([...prev, ...its.map(chaveItem)])))
                }
                irParaPreview={irPreviewNonce}
                mobile
              />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── SELETOR DE CLIENTE CADASTRADO ───────────────────────────────────────────
// Busca clientes do cadastro central e vincula ao orçamento (preenche os campos).
function SeletorCliente({
  clienteVinculadoId, clienteNome, onVincular,
}: {
  clienteVinculadoId: string | null
  clienteNome: string
  onVincular: (c: { id: string; nome: string; telefone: string; endereco: string } | null) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [lista, setLista] = useState<{ id: string; nome: string; telefone: string; endereco: string; cidade: string }[]>([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!aberto || lista.length > 0) return
    setCarregando(true)
    listarClientes()
      .then(cs => setLista(cs.map(c => ({ id: c.id, nome: c.nome, telefone: c.telefone, endereco: c.endereco, cidade: c.cidade }))))
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [aberto, lista.length])

  const filtrados = lista.filter(c => {
    const q = busca.toLowerCase()
    return c.nome.toLowerCase().includes(q) || c.telefone.includes(busca)
  })

  if (clienteVinculadoId) {
    return (
      <div className="flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/30 px-2 py-1.5">
        <UserRound size={12} className="text-primary shrink-0" />
        <span className="text-xs text-primary font-medium truncate flex-1">Vinculado: {clienteNome}</span>
        <button onClick={() => onVincular(null)} className="text-primary/70 hover:text-primary shrink-0" aria-label="Desvincular cliente"><X size={12} /></button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setAberto(v => !v)}
        className="w-full flex items-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
      >
        <Users size={12} /> Vincular cliente cadastrado
        <ChevronDown size={12} className="ml-auto" />
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setAberto(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg bg-popover border border-border shadow-xl p-2 space-y-1.5 max-h-64 overflow-y-auto">
            <Input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="h-8 text-xs"
              autoFocus
            />
            {carregando ? (
              <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-primary" /></div>
            ) : filtrados.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-3">
                {lista.length === 0 ? 'Nenhum cliente cadastrado ainda.' : 'Nenhum resultado.'}
              </p>
            ) : (
              filtrados.slice(0, 30).map(c => (
                <button
                  key={c.id}
                  onClick={() => { onVincular(c); setAberto(false); setBusca('') }}
                  className="w-full text-left rounded-md px-2 py-1.5 hover:bg-accent transition-colors"
                >
                  <p className="text-xs font-medium truncate">{c.nome}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {[c.telefone, c.cidade].filter(Boolean).join(' · ') || 'Sem contato'}
                  </p>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── PAINEL LATERAL com abas (inclui Preview integrado) ──────────────────────
interface PainelLateralProps {
  equipamentos: EquipamentoOrcamento[]
  itens: ItemOrcamento[]
  totais: { totalCusto: number; totalVenda: number; lucro: number; margemLucro: number }
  clienteNome: string
  clienteEndereco: string
  clienteTelefone: string
  observacoes: string
  modoVisualizacao: 'venda' | 'custo'
  salvando: boolean
  orcamentoSalvo: Orcamento | null
  onEquipamentosChange: (eq: EquipamentoOrcamento[]) => void
  onItensChange: (it: ItemOrcamento[]) => void
  onClienteNomeChange: (v: string) => void
  onClienteEnderecoChange: (v: string) => void
  onClienteTelefoneChange: (v: string) => void
  clienteVinculadoId: string | null
  onVincularCliente: (c: { id: string; nome: string; telefone: string; endereco: string } | null) => void
  onModoVisualizacaoChange: (v: 'venda' | 'custo') => void
  onSalvar: () => void
  itensExtras: ItemOrcamento[]
  onItensExtrasChange: (it: ItemOrcamento[]) => void
  desconto: { tipo: 'percentual' | 'valor'; valor: number }
  onDescontoChange: (d: { tipo: 'percentual' | 'valor'; valor: number }) => void
  onAjustarItem: (it: ItemOrcamento, campo: 'quantidade' | 'precoVenda' | 'precoCusto', valor: number) => void
  onRemoverItens: (its: ItemOrcamento[]) => void
  irParaPreview: number
  mobile?: boolean
}

function PainelLateral({
  equipamentos, itens, totais,
  clienteNome, clienteEndereco, clienteTelefone, observacoes,
  modoVisualizacao, salvando, orcamentoSalvo,
  onEquipamentosChange, onItensChange,
  onClienteNomeChange, onClienteEnderecoChange, onClienteTelefoneChange,
  clienteVinculadoId, onVincularCliente,
  onModoVisualizacaoChange, onSalvar,
  itensExtras, onItensExtrasChange,
  desconto, onDescontoChange, onAjustarItem, onRemoverItens, irParaPreview, mobile = false,
}: PainelLateralProps) {
  const perfil = (() => { try { return carregarPerfil() } catch { return {} as ReturnType<typeof carregarPerfil> } })()
  const cor = perfil.corPrimaria ?? '#0ea5e9'
  const [aba, setAba] = useState<'equipamentos' | 'acessorios' | 'eletrico' | 'servicos' | 'preview'>('equipamentos')

  const itensAcessorios = itens.filter(i => i.categoria === 'material' && !i.descricao.toLowerCase().includes('fio') && !i.descricao.toLowerCase().includes('disjuntor'))
  const itensEletrico = itens.filter(i => i.categoria === 'material' && (i.descricao.toLowerCase().includes('fio') || i.descricao.toLowerCase().includes('disjuntor')))
  const itensServicos = itensExtras.filter(i => i.categoria === 'servico')

  // Equipamentos agrupados por potência+marca+tipo (mesma potência da mesma marca vira 1 linha somando a quantidade)
  const equipAgrupados = Object.values(
    equipamentos.reduce((acc, eq) => {
      const chave = `${eq.marca}|${eq.tipo}|${eq.btu}`
      if (!acc[chave]) acc[chave] = { marca: eq.marca, tipo: eq.tipo, btu: eq.btu, quantidade: 0, ambientes: [] as string[] }
      acc[chave].quantidade += eq.quantidade
      if (eq.ambiente) acc[chave].ambientes.push(eq.ambiente)
      return acc
    }, {} as Record<string, { marca: string; tipo: string; btu: number; quantidade: number; ambientes: string[] }>)
  )

  const temOrcamento = equipamentos.length > 0 || itensExtras.length > 0

  // Quando novos equipamentos chegam via IA, vai para a aba equipamentos
  const prevCountRef = React.useRef(equipamentos.length)
  useEffect(() => {
    if (equipamentos.length > prevCountRef.current && aba !== 'preview') {
      setAba('equipamentos')
    }
    prevCountRef.current = equipamentos.length
  }, [equipamentos.length, aba])

  // Botao "Exportar" (flutuante) pede para abrir direto na aba Preview
  useEffect(() => {
    if (irParaPreview > 0) setAba('preview')
  }, [irParaPreview])

  const adicionarEquipamento = () => {
    const eq = montarEquipamento({ marca: 'Samsung', tipo: 'hi-wall', btu: 12000, quantidade: 1, ambiente: `Amb. ${equipamentos.length + 1}`, distancia: 5, tensao: '220V' })
    if (eq) onEquipamentosChange([...equipamentos, eq])
  }

  const editarEquipamento = (id: string, campo: string, valor: string | number | null) => {
    onEquipamentosChange(equipamentos.map(e => {
      if (e.id !== id) return e
      const upd = { ...e, [campo]: valor }
      // marca/tipo/btu mudam as specs; distância muda carga de gás e metragens
      if (['marca', 'tipo', 'btu', 'distanciaTubulacao', 'tensao'].includes(campo)) {
        const novo = montarEquipamento({ marca: upd.marca, tipo: upd.tipo, btu: upd.btu, quantidade: upd.quantidade, ambiente: upd.ambiente, distancia: upd.distanciaTubulacao, tensao: upd.tensao })
        return novo ?? upd
      }
      return upd
    }))
  }

  const removerEquipamento = (id: string) => {
    onEquipamentosChange(equipamentos.filter(e => e.id !== id))
  }

  type AbaId = 'equipamentos' | 'acessorios' | 'eletrico' | 'servicos' | 'preview'
  const ABAS: { id: AbaId; label: string; icon: React.ReactNode; count?: number; soComOrcamento?: boolean }[] = [
    { id: 'equipamentos', label: 'Equip.', icon: <Cpu size={11} />, count: equipamentos.length },
    { id: 'servicos', label: 'Servicos', icon: <Wrench size={11} />, count: itensServicos.length },
    { id: 'acessorios', label: 'Acessor.', icon: <Package size={11} />, count: itensAcessorios.length },
    { id: 'eletrico', label: 'Eletrico', icon: <ZapElec size={11} />, count: itensEletrico.length },
    { id: 'preview', label: 'Preview', icon: <Eye size={11} />, soComOrcamento: true },
  ]

  return (
    <div className={cn(
      'flex flex-col bg-card/30 overflow-hidden',
      mobile ? 'w-full' : 'hidden lg:flex w-80 xl:w-96 border-l border-border'
    )}>
      {/* Abas */}
      <div className="flex border-b border-border bg-card/50">
        {ABAS.filter(a => !a.soComOrcamento || temOrcamento).map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors relative',
              aba === a.id
                ? 'text-foreground bg-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            {a.icon}
            {a.label}
            {(a.count ?? 0) > 0 && (
              <span className={cn('ml-0.5 px-1 py-px rounded-full text-[9px] font-bold',
                aba === a.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              )}>{a.count}</span>
            )}
            {aba === a.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: cor }} />}
          </button>
        ))}
        {aba !== 'preview' && (
          <Button
            variant="ghost" size="sm"
            className="px-3 h-auto rounded-none border-l border-border text-[11px] gap-1 hover:bg-accent"
            onClick={adicionarEquipamento}
            title="Adicionar equipamento"
          >
            <Plus size={11} /> Add
          </Button>
        )}
      </div>

      {/* ── ABA PREVIEW — ocupa todo o espaco disponivel ── */}
      {aba === 'preview' && (
        <PreviewOrcamento
          equipamentos={equipamentos}
          itens={itens}
          totais={totais}
          clienteNome={clienteNome}
          clienteEndereco={clienteEndereco}
          clienteTelefone={clienteTelefone}
          observacoes={observacoes}
          onVoltar={() => setAba('equipamentos')}
          onSalvar={onSalvar}
          salvando={salvando}
          salvo={!!orcamentoSalvo}
          modoCompacto
        />
      )}

      {/* ── ABAS DE EDICAO ── */}
      {aba !== 'preview' && (
        <>
          {/* Conteudo da aba */}
          <div className="flex-1 p-3 space-y-2 overflow-y-auto">
            {aba === 'equipamentos' && (
              equipamentos.length === 0
                ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Cpu size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground/80">Nenhum equipamento</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Use o chat ou clique em Add para adicionar</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={adicionarEquipamento} className="gap-1.5 text-xs">
                      <Plus size={12} /> Adicionar equipamento
                    </Button>
                  </div>
                )
                : equipamentos.map(eq => (
                  <EquipamentoCard
                    key={eq.id} eq={eq}
                    onEditar={editarEquipamento}
                    onRemover={removerEquipamento}
                  />
                ))
            )}

            {aba === 'acessorios' && (
              <div className="space-y-1">
                {/* Equipamentos (aparelhos) com quantitativo — agrupados por potência/marca */}
                {equipAgrupados.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1.5">Equipamentos (aparelhos)</p>
                    <div className="space-y-1">
                      {equipAgrupados.map((g, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold leading-tight truncate">
                              {g.marca && g.marca !== 'Genérico' ? `${g.marca} ` : ''}{rotuloTipo(g.tipo)} <span style={{ color: cor }}>{formatarBtu(g.btu)}</span>
                            </p>
                            {g.ambientes.length > 0 && (
                              <p className="text-[10px] text-muted-foreground truncate">{g.ambientes.join(' · ')}</p>
                            )}
                          </div>
                          <span className="ml-auto shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ background: `${cor}20`, color: cor }}>× {g.quantidade}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Tubulacoes, suportes e acessorios de instalacao</p>
                  {itensAcessorios.length > 0 && (
                    <button
                      onClick={() => { if (confirm(`Apagar todos os ${itensAcessorios.length} acessorios da lista?`)) onRemoverItens(itensAcessorios) }}
                      className="flex items-center gap-1 text-[10px] font-medium text-destructive/80 hover:text-destructive shrink-0"
                      title="Apagar todos os acessorios"
                    >
                      <Trash2 size={11} /> Apagar todos
                    </button>
                  )}
                </div>
                {itensAcessorios.length === 0
                  ? <p className="text-xs text-muted-foreground text-center py-4">Nenhum acessorio calculado ainda</p>
                  : itensAcessorios.map((it, i) => (
                    <ItemMaterialRow key={i} item={it} cor={cor} onAjustar={onAjustarItem} onRemover={() => onRemoverItens([it])} />
                  ))
                }
              </div>
            )}

            {aba === 'eletrico' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Cabos, fios e disjuntores</p>
                  {itensEletrico.length > 0 && (
                    <button
                      onClick={() => { if (confirm(`Apagar todos os ${itensEletrico.length} itens eletricos da lista?`)) onRemoverItens(itensEletrico) }}
                      className="flex items-center gap-1 text-[10px] font-medium text-destructive/80 hover:text-destructive shrink-0"
                      title="Apagar todos os itens eletricos"
                    >
                      <Trash2 size={11} /> Apagar todos
                    </button>
                  )}
                </div>
                {itensEletrico.length === 0
                  ? <p className="text-xs text-muted-foreground text-center py-4">Nenhum item eletrico calculado ainda</p>
                  : itensEletrico.map((it, i) => (
                    <ItemMaterialRow key={i} item={it} cor={cor} onAjustar={onAjustarItem} onRemover={() => onRemoverItens([it])} />
                  ))
                }
              </div>
            )}

            {aba === 'servicos' && (
              <div className="space-y-1">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-2">Mao de obra e servicos avulsos</p>
                {itensServicos.length === 0
                  ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Wrench size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground/80">Nenhum servico</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Peca no chat (ex: &quot;adiciona visita tecnica&quot;) ou clique abaixo</p>
                      </div>
                    </div>
                  )
                  : itensServicos.map((it) => (
                    <ItemServicoRow
                      key={it.id}
                      item={it}
                      cor={cor}
                      onEditar={(campo, valor) => onItensExtrasChange(itensExtras.map(x => x.id === it.id ? { ...x, [campo]: valor } : x))}
                      onRemover={() => onItensExtrasChange(itensExtras.filter(x => x.id !== it.id))}
                    />
                  ))
                }
                <SeletorServicoMaterial
                  perfil={perfil}
                  cor={cor}
                  onAddItem={(it) => onItensExtrasChange([...itensExtras, it])}
                />
              </div>
            )}
          </div>

          {/* Dados do cliente */}
          <div className="p-3 border-t border-border space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Cliente</p>
            <SeletorCliente
              clienteVinculadoId={clienteVinculadoId}
              clienteNome={clienteNome}
              onVincular={onVincularCliente}
            />
            <Input value={clienteNome} onChange={e => onClienteNomeChange(e.target.value)} placeholder="Nome" className="h-8 text-xs" />
            <Input value={clienteTelefone} onChange={e => onClienteTelefoneChange(e.target.value)} placeholder="Telefone" className="h-8 text-xs" />
            <Input value={clienteEndereco} onChange={e => onClienteEnderecoChange(e.target.value)} placeholder="Endereco" className="h-8 text-xs" />
          </div>

          {/* Totais + acoes */}
          <div className="p-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Totais</p>
              <div className="flex rounded-md border border-border overflow-hidden text-[10px]">
                <button onClick={() => onModoVisualizacaoChange('venda')} className={cn('px-2 py-1', modoVisualizacao === 'venda' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>Venda</button>
                <button onClick={() => onModoVisualizacaoChange('custo')} className={cn('px-2 py-1', modoVisualizacao === 'custo' ? 'bg-amber-500 text-black' : 'hover:bg-accent')}>Custo</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <TotaisCard label="Custo" valor={fmt(totais.totalCusto)} dim />
              <TotaisCard label="Venda" valor={fmt(totais.totalVenda)} destaque />
              <TotaisCard label="Lucro" valor={fmt(totais.lucro)} />
              <TotaisCard label="Margem" valor={`${totais.margemLucro.toFixed(1)}%`} />
            </div>

            {/* Desconto — por percentual (%) ou valor fixo (R$) */}
            {temOrcamento && (
              <div className="rounded-xl border border-border bg-background p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Percent size={11} /> Desconto
                  </span>
                  <div className="flex rounded-md border border-border overflow-hidden text-[10px]">
                    <button
                      onClick={() => onDescontoChange({ ...desconto, tipo: 'percentual' })}
                      className={cn('px-2 py-0.5', desconto.tipo === 'percentual' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
                    >%</button>
                    <button
                      onClick={() => onDescontoChange({ ...desconto, tipo: 'valor' })}
                      className={cn('px-2 py-0.5', desconto.tipo === 'valor' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
                    >R$</button>
                  </div>
                </div>
                <Input
                  type="number" min={0}
                  value={desconto.valor || ''}
                  onChange={e => onDescontoChange({ ...desconto, valor: Math.max(0, Number(e.target.value) || 0) })}
                  placeholder={desconto.tipo === 'percentual' ? 'Ex: 10 (%)' : 'Ex: 150 (R$)'}
                  className="h-8 text-xs"
                />
              </div>
            )}

            {temOrcamento && (
              <Button onClick={() => setAba('preview')} variant="outline" className="w-full h-9 text-sm gap-2">
                <Eye size={13} /> Visualizar Orcamento
              </Button>
            )}
            <Button onClick={onSalvar} disabled={salvando || !!orcamentoSalvo} className="w-full h-9 text-sm gap-2">
              {salvando ? <><Loader2 size={13} className="animate-spin" /> Salvando...</>
                : orcamentoSalvo ? <><CheckCircle size={13} /> Salvo!</>
                : <><CheckCircle size={13} /> Salvar Orcamento</>}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── ITEM MATERIAL ROW (editavel na mao) ──────────────────────────────────────
// Obs.: nos itens gerados, precoCusto/precoVenda ja sao o TOTAL da linha (unit x qtd).
function ItemMaterialRow({ item, cor, onAjustar, onRemover }: {
  item: ItemOrcamento
  cor: string
  onAjustar?: (it: ItemOrcamento, campo: 'quantidade' | 'precoVenda' | 'precoCusto', valor: number) => void
  onRemover?: () => void
}) {
  const [expandido, setExpandido] = useState(false)
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => onAjustar && setExpandido(!expandido)}
          className={cn('flex-1 min-w-0 text-left', !onAjustar && 'cursor-default')}
        >
          <p className="text-xs truncate">{item.descricao}</p>
          <p className="text-[10px] text-muted-foreground">
            {item.quantidade} {item.unidade}{onAjustar ? ' · toque para editar' : ''}
          </p>
        </button>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold" style={{ color: cor }}>{fmt(item.precoVenda)}</p>
          <p className="text-[9px] text-amber-500">{fmt(item.precoCusto)}</p>
        </div>
        {onRemover && (
          <button
            onClick={onRemover}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 transition-colors"
            title="Excluir item"
            aria-label={`Excluir ${item.descricao}`}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
      {expandido && onAjustar && (
        <div className="grid grid-cols-3 gap-2 px-3 pb-3 pt-1 border-t border-border">
          <div>
            <label className="text-[9px] text-muted-foreground uppercase">Qtd</label>
            <Input type="number" value={item.quantidade} onChange={e => onAjustar(item, 'quantidade', Number(e.target.value) || 0)} className="h-7 text-xs" />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground uppercase">Custo (total)</label>
            <Input type="number" value={item.precoCusto} onChange={e => onAjustar(item, 'precoCusto', Number(e.target.value) || 0)} className="h-7 text-xs" />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground uppercase">Venda (total)</label>
            <Input type="number" value={item.precoVenda} onChange={e => onAjustar(item, 'precoVenda', Number(e.target.value) || 0)} className="h-7 text-xs" />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SELETOR DE SERVIÇO / MATERIAL (pré-seleção da tabela) ────────────────────
function novoItemExtra(base: Partial<ItemOrcamento>): ItemOrcamento {
  return {
    id: `extra-${crypto.randomUUID()}`,
    descricao: base.descricao ?? 'Novo serviço',
    quantidade: base.quantidade ?? 1,
    unidade: base.unidade ?? 'un',
    precoCusto: base.precoCusto ?? 0,
    precoVenda: base.precoVenda ?? 0,
    categoria: base.categoria ?? 'servico',
  }
}

function SeletorServicoMaterial({ perfil, cor, onAddItem }: {
  perfil: ReturnType<typeof carregarPerfil>
  cor: string
  onAddItem: (it: ItemOrcamento) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [cat, setCat] = useState<CategoriaServico>('instalacao')

  const servicos: PrecoServico[] = (perfil.servicos ?? []).filter(s => s.categoria === cat)
  const materiais: PrecoMaterial[] = perfil.materiais ?? []
  const semAcento = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  // Prioriza o KIT que o técnico montou no perfil para esta categoria.
  // Se ele não configurou nada, cai no reconhecimento por palavra-chave (fallback).
  const kitIds = perfil.kitsMateriais?.[cat] ?? []
  const chaves = SERVICO_MATERIAIS[cat] ?? []
  const materiaisVinculados: PrecoMaterial[] = kitIds.length > 0
    ? (kitIds.map(id => materiais.find(m => m.id === id)).filter(Boolean) as PrecoMaterial[])
    : materiais.filter(m => chaves.some(k => semAcento(m.nome).includes(semAcento(k))))

  if (!aberto) {
    return (
      <div className="flex gap-2 mt-2">
        <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => setAberto(true)}>
          <LayoutGrid size={12} /> Escolher da tabela
        </Button>
        <Button
          size="sm" variant="outline" className="flex-1 gap-1.5 text-xs"
          onClick={() => onAddItem(novoItemExtra({ descricao: 'Novo serviço', categoria: 'servico' }))}
        >
          <Plus size={12} /> Digitar manual
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-2 rounded-xl border border-border bg-background overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tabela de serviços</p>
        <button onClick={() => setAberto(false)} className="p-1 rounded text-muted-foreground hover:text-foreground" aria-label="Fechar">
          <X size={13} />
        </button>
      </div>

      {/* Categorias */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-border">
        {(Object.keys(CATEGORIAS_SERVICO) as CategoriaServico[]).map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn('px-2 py-1 rounded-md text-[10px] font-medium transition-colors', cat === c ? 'text-primary-foreground' : 'bg-muted/40 hover:bg-accent text-muted-foreground')}
            style={cat === c ? { background: cor } : undefined}
          >
            {CATEGORIAS_SERVICO[c]}
          </button>
        ))}
      </div>

      {/* Serviços da categoria */}
      <div className="max-h-48 overflow-y-auto p-2 space-y-1">
        {servicos.length === 0
          ? <p className="text-[11px] text-muted-foreground text-center py-3">Nenhum serviço nesta categoria</p>
          : servicos.map(s => (
            <button
              key={s.id}
              onClick={() => onAddItem(novoItemExtra({ descricao: s.nome, categoria: 'servico', precoCusto: s.precoCusto, precoVenda: s.precoVenda }))}
              className="w-full flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-left hover:bg-accent transition-colors"
            >
              <Plus size={12} className="shrink-0 text-muted-foreground" />
              <span className="flex-1 min-w-0 text-[11px] leading-tight truncate">{s.nome}</span>
              <span className="shrink-0 text-[11px] font-semibold" style={{ color: cor }}>{fmt(s.precoVenda)}</span>
            </button>
          ))
        }
      </div>

      {/* Materiais vinculados a este serviço */}
      {materiaisVinculados.length > 0 && (
        <div className="p-2 border-t border-border">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Materiais empregados · toque para adicionar (qtd. pela fala ou edite)
          </p>
          <div className="flex flex-wrap gap-1">
            {materiaisVinculados.map(m => (
              <button
                key={m.id}
                onClick={() => onAddItem(novoItemExtra({ descricao: m.nome, categoria: 'material', unidade: m.unidade, precoCusto: m.precoCusto, precoVenda: m.precoVenda }))}
                className="flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-[10px] hover:bg-accent transition-colors"
              >
                <Plus size={10} className="text-muted-foreground" /> {m.nome}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ItemServicoRow({ item, cor, onEditar, onRemover }: {
  item: ItemOrcamento
  cor: string
  onEditar: (campo: string, valor: string | number) => void
  onRemover: () => void
}) {
  const [expandido, setExpandido] = useState(false)
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={() => setExpandido(!expandido)} className="flex-1 min-w-0 text-left">
          <p className="text-xs truncate">{item.descricao || 'Servico'}</p>
          <p className="text-[10px] text-muted-foreground">{item.quantidade} {item.unidade} · toque para editar</p>
        </button>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold" style={{ color: cor }}>{fmt(item.precoVenda * item.quantidade)}</p>
          <p className="text-[9px] text-amber-500">{fmt(item.precoCusto * item.quantidade)}</p>
        </div>
        <button onClick={onRemover} className="p-1 rounded text-muted-foreground hover:text-destructive" title="Remover">
          <Trash2 size={13} />
        </button>
      </div>
      {expandido && (
        <div className="grid grid-cols-2 gap-2 px-3 pb-3 pt-1 border-t border-border">
          <label className="col-span-2 text-[9px] text-muted-foreground uppercase">Descricao</label>
          <Input
            value={item.descricao}
            onChange={e => onEditar('descricao', e.target.value)}
            className="col-span-2 h-7 text-xs"
            placeholder="Ex: Visita tecnica"
          />
          <div>
            <label className="text-[9px] text-muted-foreground uppercase">Qtd</label>
            <Input type="number" value={item.quantidade} onChange={e => onEditar('quantidade', Number(e.target.value) || 0)} className="h-7 text-xs" />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground uppercase">Unidade</label>
            <Input value={item.unidade} onChange={e => onEditar('unidade', e.target.value)} className="h-7 text-xs" />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground uppercase">Custo (un)</label>
            <Input type="number" value={item.precoCusto} onChange={e => onEditar('precoCusto', Number(e.target.value) || 0)} className="h-7 text-xs" />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground uppercase">Venda (un)</label>
            <Input type="number" value={item.precoVenda} onChange={e => onEditar('precoVenda', Number(e.target.value) || 0)} className="h-7 text-xs" />
          </div>
        </div>
      )}
    </div>
  )
}

function TotaisCard({ label, valor, dim, destaque }: { label: string; valor: string; dim?: boolean; destaque?: boolean }) {
  return (
    <div className={cn('p-2 rounded-xl border text-center', destaque ? 'bg-primary/10 border-primary/30' : 'bg-background border-border')}>
      <p className="text-[9px] text-muted-foreground uppercase">{label}</p>
      <p className={cn('text-xs font-bold', dim ? 'text-amber-500' : destaque ? 'text-primary' : 'text-profit')}>{valor}</p>
    </div>
  )
}

// ─── CARD DE EQUIPAMENTO ─────────────────────────────────────────────��────────
function EquipamentoCard({ eq, onEditar, onRemover }: {
  eq: EquipamentoOrcamento
  onEditar: (id: string, campo: string, valor: string | number | null) => void
  onRemover: (id: string) => void
}) {
  const [expandido, setExpandido] = useState(false)

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      {/* Cabeçalho: nome comercial, potência (BTU/h), ambiente e quantidade */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
        <p className="text-sm font-bold leading-tight truncate">
          {rotuloTipo(eq.tipo)} <span className="text-primary">{formatarBtu(eq.btu)}</span>
        </p>
        <span className="text-[10px] text-muted-foreground truncate">· {eq.ambiente}</span>
        <span className="ml-auto shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary/15 text-primary">× {eq.quantidade}</span>
      </div>
      <div className="flex items-start gap-2 p-3 pt-1.5">
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <Label className="text-[9px] text-muted-foreground uppercase tracking-wide">Marca</Label>
            <Select value={String(eq.marca ?? '')} onValueChange={v => onEditar(eq.id, 'marca', v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{MARCAS_DISPONIVEIS.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[9px] text-muted-foreground uppercase tracking-wide">Tipo</Label>
            <Select value={String(eq.tipo ?? '')} onValueChange={v => onEditar(eq.id, 'tipo', v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS_DISPONIVEIS.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[9px] text-muted-foreground uppercase tracking-wide">BTU/h</Label>
            <Input type="number" value={eq.btu} onChange={e => onEditar(eq.id, 'btu', Number(e.target.value))} className="h-7 text-xs" step={1000} />
            <div className="flex gap-1 overflow-x-auto pt-0.5" style={{ scrollbarWidth: 'none' }}>
              {BTUS_COMUNS.map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => onEditar(eq.id, 'btu', b)}
                  className={cn('shrink-0 px-1.5 py-0.5 rounded text-[9px] border transition-colors', eq.btu === b ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-accent')}
                >
                  {b / 1000}k
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[9px] text-muted-foreground uppercase tracking-wide">Ambiente</Label>
            <Input value={eq.ambiente} onChange={e => onEditar(eq.id, 'ambiente', e.target.value)} className="h-7 text-xs" placeholder="Sala" />
            <div className="flex gap-1 overflow-x-auto pt-0.5" style={{ scrollbarWidth: 'none' }}>
              {AMBIENTES_COMUNS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => onEditar(eq.id, 'ambiente', a)}
                  className={cn('shrink-0 px-1.5 py-0.5 rounded text-[9px] border transition-colors', eq.ambiente === a ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-accent')}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[9px] text-muted-foreground uppercase tracking-wide">Quantidade</Label>
            <Input type="number" min={1} value={eq.quantidade} onChange={e => onEditar(eq.id, 'quantidade', Math.max(1, Number(e.target.value)))} className="h-7 text-xs" />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[9px] text-muted-foreground uppercase tracking-wide">Distancia (m)</Label>
            <Input type="number" min={0} step={0.5} value={eq.distanciaTubulacao} onChange={e => onEditar(eq.id, 'distanciaTubulacao', Math.max(0, Number(e.target.value)))} className="h-7 text-xs" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <button onClick={() => setExpandido(!expandido)} className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <ChevronDown size={12} className={cn('transition-transform', expandido && 'rotate-180')} />
          </button>
          <button onClick={() => onRemover(eq.id)} className="p-1.5 rounded-md hover:bg-destructive/20 text-destructive transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {expandido && (
        <div className="px-3 pb-3 border-t border-border pt-2 grid grid-cols-2 gap-2">
          <Spec label="Cabo Interligacao" valor={eq.caboInterligacao} />
          <Spec label="Cabo Alimentacao" valor={eq.caboAlimentacao} />
          <Spec label="Disjuntor" valor={eq.disjuntor} />
                <Spec label="Tub. Alta" valor={eq.tubulacaoLiquido} />
                <Spec label="Tub. Baixa" valor={eq.tubulacaoSuccao} />
          <Spec label="Distancia" valor={`${eq.distanciaTubulacao}m`} />
        </div>
      )}
    </div>
  )
}

function Spec({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-[10px] font-medium font-mono">{valor}</p>
    </div>
  )
}
