'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp, TrendingDown, FileText, Wallet, AlertCircle, Plus, Thermometer,
  Mic, Users, HardHat, ArrowRight, PiggyBank, HelpCircle,
  CalendarClock, AlertTriangle, Wind, Phone,
} from 'lucide-react'
import { GuiaRapido } from '@/components/telas/guia-rapido'
import { carregarOrcamentos } from '@/lib/storage'
import { MAX_ORCAMENTOS } from '@/lib/tipos'
import type { Orcamento, ResumoDashboard } from '@/lib/tipos'
import { resumoDashboard } from '@/lib/actions/financeiro'
import { panoramaManutencoes } from '@/lib/actions/clientes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  ChartLegend, ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Bar, CartesianGrid, XAxis, YAxis, Cell, Pie, PieChart,
  ComposedChart, Line,
} from 'recharts'

type Pagina = 'dashboard' | 'novo-orcamento' | 'historico' | 'clientes' | 'fluxo-caixa' | 'funcionarios' | 'tabela-precos' | 'perfil' | 'admin'

const STATUS_LABEL: Record<Orcamento['status'], string> = {
  rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', recusado: 'Recusado',
}
const STATUS_COLOR: Record<Orcamento['status'], string> = {
  rascunho: 'border-muted-foreground/30 text-muted-foreground',
  enviado: 'border-cost/40 text-cost',
  aprovado: 'border-profit/40 text-profit',
  recusado: 'border-destructive/40 text-destructive',
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
// valores do servidor vêm em centavos
function fmtC(centavos: number) {
  return fmt(centavos / 100)
}

const chartConfig = {
  receitas: { label: 'Receitas', color: 'var(--chart-1)' },
  despesas: { label: 'Despesas', color: 'var(--chart-2)' },
  lucro: { label: 'Lucro', color: 'var(--chart-3)' },
} satisfies ChartConfig

interface DashboardProps {
  ativo?: boolean
  onNovoOrcamento: () => void
  onAbrirHistorico: () => void
  onAbrirOrcamento?: (o: Orcamento) => void
  onNavegar?: (p: Pagina) => void
}

export function Dashboard({ ativo, onNovoOrcamento, onAbrirHistorico, onAbrirOrcamento, onNavegar }: DashboardProps) {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [resumo, setResumo] = useState<ResumoDashboard | null>(null)
  const [manutencoes, setManutencoes] = useState<Awaited<ReturnType<typeof panoramaManutencoes>> | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [guiaAberto, setGuiaAberto] = useState(false)

  useEffect(() => {
    if (ativo === false) return
    setOrcamentos(carregarOrcamentos())
    setCarregando(true)
    resumoDashboard()
      .then(setResumo)
      .catch(() => {})
      .finally(() => setCarregando(false))
    panoramaManutencoes().then(setManutencoes).catch(() => {})
  }, [ativo])

  const aprovados = orcamentos.filter(o => o.status === 'aprovado')
  const totalFaturado = aprovados.reduce((s, o) => s + o.totalVenda, 0)
  const recentes = orcamentos.slice(0, 5)
  const vagas = MAX_ORCAMENTOS - orcamentos.length

  const saldo = resumo?.saldoTotal ?? 0
  const dadosMes = (resumo?.porMes ?? []).map(m => ({ ...m, lucro: m.receitas - m.despesas }))
  const temSerie = dadosMes.some(m => m.receitas > 0 || m.despesas > 0)

  // Pizza de categorias de despesa (para o técnico ver para onde vai o dinheiro)
  const despCategorias = (resumo?.topCategorias ?? [])
    .filter(c => c.tipo === 'despesa')
    .slice(0, 5)
    .map((c, i) => ({ nome: c.categoria, valor: c.total, fill: `var(--chart-${(i % 5) + 1})` }))

  return (
    <div className="px-3 py-4 sm:p-6 max-w-6xl mx-auto space-y-5 sm:space-y-6 pb-24 md:pb-6 overflow-x-hidden">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Visão Geral</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Seu negócio de refrigeração num relance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setGuiaAberto(true)} variant="outline" className="gap-2"><HelpCircle size={16} /> Guia</Button>
          <Button onClick={onNovoOrcamento} className="gap-2 flex-1 sm:flex-none"><Plus size={16} /> Novo Orçamento</Button>
          <Button onClick={onNovoOrcamento} className="gap-2 flex-1 sm:flex-none bg-blue-800 text-white hover:bg-blue-900"><Mic size={16} /> Por voz</Button>
        </div>
      </div>

      <GuiaRapido open={guiaAberto} onOpenChange={setGuiaAberto} onNavegar={onNavegar} />

      {/* Alerta de limite */}
      {vagas <= 3 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-cost/10 border border-cost/30">
          <AlertCircle size={18} className="text-cost flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-cost">
              {vagas === 0 ? 'Limite de orçamentos atingido' : `Restam ${vagas} vaga${vagas > 1 ? 's' : ''} de orçamento`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              O plano suporta até {MAX_ORCAMENTOS} orçamentos salvos. Exclua antigos para liberar espaço.
            </p>
          </div>
        </div>
      )}

      {/* Métricas financeiras principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Saldo total" valor={fmtC(saldo)} icon={PiggyBank}
          cor={saldo >= 0 ? 'text-profit' : 'text-destructive'}
          tint={saldo >= 0 ? 'bg-profit/15' : 'bg-destructive/15'}
          destaque hint={saldo >= 0 ? 'No azul' : 'No vermelho'}
        />
        <MetricCard label="Receitas do mês" valor={fmtC(resumo?.receitasMes ?? 0)} icon={TrendingUp} cor="text-profit" tint="bg-profit/15" />
        <MetricCard label="Despesas do mês" valor={fmtC(resumo?.despesasMes ?? 0)} icon={TrendingDown} cor="text-cost" tint="bg-cost/15" />
        <MetricCard label="Folha mensal" valor={fmtC(resumo?.folhaMensal ?? 0)} icon={HardHat} cor="text-primary" tint="bg-primary/15" />
      </div>

      {/* Panorama de manutenções (vencidas e a vencer) */}
      <PainelManutencoes dados={manutencoes} onVerClientes={() => onNavegar?.('clientes')} />

      {/* Gráfico de receitas x despesas (6 meses) */}
      <div className="rounded-xl bg-card border border-border p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">Receitas x Despesas</h2>
            <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
          </div>
          <button onClick={() => onNavegar?.('fluxo-caixa')} className="text-xs text-primary hover:underline flex items-center gap-1">
            Fluxo de caixa <ArrowRight size={12} />
          </button>
        </div>
        {temSerie ? (
          <>
            {/* Legenda destacada com os valores do mês atual */}
            {(() => {
              const atual = dadosMes[dadosMes.length - 1]
              const itens = [
                { label: 'Receitas', valor: atual?.receitas ?? 0, cor: 'var(--chart-1)', hint: 'entrou' },
                { label: 'Despesas', valor: atual?.despesas ?? 0, cor: 'var(--chart-2)', hint: 'saiu' },
                { label: 'Lucro',    valor: atual?.lucro ?? 0,    cor: 'var(--chart-3)', hint: 'sobrou' },
              ]
              return (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {itens.map(it => (
                    <div key={it.label} className="rounded-lg border border-border bg-background p-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: it.cor }} />
                        <span className="text-[11px] text-muted-foreground truncate">{it.label}</span>
                      </div>
                      <p className="text-sm font-bold mt-1 tabular-nums" style={{ color: it.cor }}>{fmtC(it.valor)}</p>
                      <p className="text-[10px] text-muted-foreground">no mês</p>
                    </div>
                  ))}
                </div>
              )
            })()}
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <ComposedChart data={dadosMes} barGap={4} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} width={48}
                  tickFormatter={(v: number) => `R$${Math.round(v / 100 / 1000)}k`} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent
                  formatter={(value, name, item) => (
                    <div className="flex items-center gap-2 w-full">
                      <span className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: item?.color }} />
                      <span className="text-muted-foreground flex-1">{chartConfig[name as keyof typeof chartConfig]?.label ?? name}</span>
                      <span className="font-mono font-medium tabular-nums text-foreground">{fmtC(Number(value))}</span>
                    </div>
                  )}
                />} />
                <ChartLegend content={<ChartLegendContent className="pt-2 gap-5 text-sm" />} />
                <Bar name="Receitas" dataKey="receitas" fill="var(--color-receitas)" radius={[4, 4, 0, 0]} maxBarSize={38} />
                <Bar name="Despesas" dataKey="despesas" fill="var(--color-despesas)" radius={[4, 4, 0, 0]} maxBarSize={38} />
                <Line
                  name="Lucro" dataKey="lucro" type="monotone"
                  stroke="var(--color-lucro)" strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--color-lucro)' }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ChartContainer>
          </>
        ) : (
          <VazioGrafico
            texto="Ainda não há lançamentos. Registre recebimentos e despesas para ver a evolução aqui."
            acao="Abrir fluxo de caixa" onAcao={() => onNavegar?.('fluxo-caixa')}
          />
        )}
      </div>

      {/* Contadores de cadastro + categorias de despesa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 grid grid-cols-2 gap-3 sm:gap-4 content-start">
          <ClickCard label="Clientes" valor={String(resumo?.totalClientes ?? 0)} icon={Users} onClick={() => onNavegar?.('clientes')} />
          <ClickCard label="Funcionários" valor={`${resumo?.funcionariosAtivos ?? 0}/${resumo?.totalFuncionarios ?? 0}`} icon={HardHat} onClick={() => onNavegar?.('funcionarios')} />
          <ClickCard label="Orçamentos" valor={`${orcamentos.length}/${MAX_ORCAMENTOS}`} icon={FileText} onClick={onAbrirHistorico} />
          <ClickCard label="Aprovados" valor={fmt(totalFaturado)} icon={TrendingUp} onClick={onAbrirHistorico} pequeno />
        </div>

        {/* Pizza de despesas por categoria */}
        <div className="lg:col-span-2 rounded-xl bg-card border border-border p-4 sm:p-5">
          <h2 className="text-base font-semibold mb-1">Para onde vai o dinheiro</h2>
          <p className="text-xs text-muted-foreground mb-3">Despesas por categoria</p>
          {despCategorias.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ChartContainer config={{}} className="h-[180px] w-[180px] shrink-0 aspect-square">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="nome" formatter={(v) => fmtC(Number(v))} />} />
                  <Pie data={despCategorias} dataKey="valor" nameKey="nome" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {despCategorias.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="flex-1 w-full space-y-1.5">
                {despCategorias.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.fill }} />
                    <span className="capitalize truncate flex-1">{d.nome}</span>
                    <span className="font-medium text-cost">{fmtC(d.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <VazioGrafico texto="Nenhuma despesa registrada ainda." />
          )}
        </div>
      </div>

      {/* Orçamentos recentes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Orçamentos Recentes</h2>
          {orcamentos.length > 5 && (
            <button onClick={onAbrirHistorico} className="text-xs text-primary hover:underline">Ver todos</button>
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
                    <p className="text-xs text-muted-foreground truncate">{o.clienteNome || 'Cliente não informado'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-sale">{fmt(o.totalVenda)}</p>
                    <p className="text-xs text-profit">Lucro: {fmt(o.lucro)}</p>
                  </div>
                  <Badge variant="outline" className={cn('text-xs', STATUS_COLOR[o.status])}>{STATUS_LABEL[o.status]}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {carregando && !resumo && (
        <p className="text-center text-xs text-muted-foreground">Carregando resumo financeiro...</p>
      )}
    </div>
  )
}

function PainelManutencoes({ dados, onVerClientes }: {
  dados: Awaited<ReturnType<typeof panoramaManutencoes>> | null
  onVerClientes: () => void
}) {
  if (!dados) return null

  const { vencidas, aVencer } = dados
  // Lista combinada: vencidas primeiro, depois a vencer; máx. 5 no cartão
  const itens = [...vencidas, ...aVencer].slice(0, 5)
  const temAlgo = dados.total > 0

  return (
    <div className="rounded-xl bg-card border border-border p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-muted flex items-center justify-center text-primary shrink-0">
            <CalendarClock size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold truncate">Manutenções</h2>
            <p className="text-xs text-muted-foreground">Vencidas e a vencer nos próximos 30 dias</p>
          </div>
        </div>
        <button onClick={onVerClientes} className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
          Clientes <ArrowRight size={12} />
        </button>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <div className="flex items-center gap-1.5 text-destructive">
            <AlertTriangle size={14} />
            <span className="text-[11px] font-medium">Vencidas</span>
          </div>
          <p className="text-2xl font-bold text-destructive mt-1 tabular-nums">{vencidas.length}</p>
        </div>
        <div className="rounded-lg border border-cost/30 bg-cost/10 p-3">
          <div className="flex items-center gap-1.5 text-cost">
            <CalendarClock size={14} />
            <span className="text-[11px] font-medium">A vencer (30d)</span>
          </div>
          <p className="text-2xl font-bold text-cost mt-1 tabular-nums">{aVencer.length}</p>
        </div>
      </div>

      {/* Lista das mais urgentes */}
      {temAlgo ? (
        <div className="space-y-2">
          {itens.map(it => {
            const atrasada = it.dias < 0
            const rotulo = atrasada
              ? `Venceu há ${Math.abs(it.dias)}d`
              : it.dias === 0 ? 'Vence hoje' : `Em ${it.dias}d`
            const linkWhats = it.clienteTelefone
              ? `https://wa.me/55${it.clienteTelefone.replace(/\D/g, '')}` : undefined
            return (
              <div key={it.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  atrasada ? 'bg-destructive/15 text-destructive' : 'bg-cost/15 text-cost')}>
                  <Wind size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{it.clienteNome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[it.tipo, it.marca, it.ambiente].filter(Boolean).join(' · ') || 'Aparelho'}
                  </p>
                </div>
                <Badge variant="outline" className={cn('text-[10px] shrink-0',
                  atrasada ? 'border-destructive/40 text-destructive' : 'border-cost/40 text-cost')}>
                  {rotulo}
                </Badge>
                {linkWhats && (
                  <a
                    href={linkWhats} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-profit/10 text-profit flex items-center justify-center hover:bg-profit/20 transition-colors shrink-0"
                    aria-label={`WhatsApp de ${it.clienteNome}`}
                  >
                    <Phone size={14} />
                  </a>
                )}
              </div>
            )
          })}
          {dados.total > itens.length && (
            <button onClick={onVerClientes} className="w-full text-center text-xs text-primary hover:underline pt-1">
              Ver mais {dados.total - itens.length} em Clientes
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
          <div className="w-10 h-10 rounded-full bg-profit/10 flex items-center justify-center">
            <CalendarClock size={18} className="text-profit" />
          </div>
          <p className="text-sm text-muted-foreground text-pretty max-w-xs">
            Nenhuma manutenção vencida ou próxima. Tudo em dia!
          </p>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, valor, icon: Icon, cor, tint, pequeno, destaque, hint }: {
  label: string; valor: string; icon: React.ElementType; cor: string; tint?: string
  pequeno?: boolean; destaque?: boolean; hint?: string
}) {
  return (
    <div className={cn('p-4 rounded-xl border space-y-3', destaque ? 'bg-brand-muted border-primary/40' : 'bg-card border-border')}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', tint ?? 'bg-muted', cor)}>
        <Icon size={18} />
      </div>
      <div>
        <p className={cn('font-bold leading-tight', pequeno ? 'text-base' : 'text-xl', cor)}>{valor}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{label}{hint ? ` · ${hint}` : ''}</p>
      </div>
    </div>
  )
}

function ClickCard({ label, valor, icon: Icon, onClick, pequeno }: {
  label: string; valor: string; icon: React.ElementType; onClick?: () => void; pequeno?: boolean
}) {
  return (
    <button onClick={onClick} className="p-4 rounded-xl bg-card border border-border space-y-2 text-left hover:border-primary/30 active:scale-[0.98] transition-all">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg bg-brand-muted flex items-center justify-center text-primary"><Icon size={16} /></div>
        <ArrowRight size={14} className="text-muted-foreground" />
      </div>
      <div>
        <p className={cn('font-bold leading-tight', pequeno ? 'text-sm' : 'text-lg')}>{valor}</p>
        <p className="text-xs text-muted-foreground leading-snug">{label}</p>
      </div>
    </button>
  )
}

function VazioGrafico({ texto, acao, onAcao }: { texto: string; acao?: string; onAcao?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-brand-muted flex items-center justify-center"><Wallet size={22} className="text-primary" /></div>
      <p className="text-sm text-muted-foreground max-w-xs text-pretty">{texto}</p>
      {acao && <Button variant="outline" size="sm" onClick={onAcao} className="gap-1.5">{acao} <ArrowRight size={13} /></Button>}
    </div>
  )
}

function EmptyState({ onNovo }: { onNovo: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border border-dashed border-border text-center">
      <div className="w-16 h-16 rounded-full bg-brand-muted flex items-center justify-center mb-4"><FileText size={28} className="text-primary" /></div>
      <p className="text-base font-medium mb-1">Nenhum orçamento ainda</p>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs">Crie seu primeiro orçamento por voz ou texto e o assistente calcula tudo automaticamente.</p>
      <Button onClick={onNovo} className="gap-2"><Plus size={16} /> Criar primeiro orçamento</Button>
    </div>
  )
}
