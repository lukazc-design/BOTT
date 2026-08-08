'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Thermometer, FileText, History, Settings, LayoutGrid,
  Wifi, WifiOff, Menu, X, ChevronRight, AlertCircle, CheckCircle2, Loader2, RefreshCw, LogOut, ShieldCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { carregarPerfil } from '@/lib/storage'
import { signOut, useSession } from '@/lib/auth-client'

// E-mail do dono com acesso ao painel de administrador
const ADMIN_EMAIL = 'lucasj0@hotmail.com'

type Pagina = 'dashboard' | 'novo-orcamento' | 'historico' | 'perfil'

interface SidebarProps {
  paginaAtiva: Pagina
  onNavegar: (p: Pagina) => void
  ollamaOnline: boolean
  ollamaErro?: string
  ollamaUrl?: string
}

interface DiagResult {
  online: boolean
  erro?: string
  detalhe?: string
  url?: string
  models?: string[]
}

const NAV = [
  { id: 'dashboard' as Pagina,       label: 'Geral',          icon: LayoutGrid   },
  { id: 'novo-orcamento' as Pagina,  label: 'Novo Orçamento', icon: FileText     },
  { id: 'historico' as Pagina,       label: 'Histórico',      icon: History      },
  { id: 'perfil' as Pagina,          label: 'Meu Perfil',     icon: Settings     },
]

export function Sidebar({ paginaAtiva, onNavegar, ollamaOnline, ollamaErro, ollamaUrl }: SidebarProps) {
  const router = useRouter()
  const { data: sessao } = useSession()
  const ehAdmin = sessao?.user?.email?.toLowerCase() === ADMIN_EMAIL
  const [aberto, setAberto] = useState(false)
  const [nomeEmpresa, setNomeEmpresa] = useState('')
  const [mostrarDiag, setMostrarDiag] = useState(false)
  const [diagCarregando, setDiagCarregando] = useState(false)
  const [diagResult, setDiagResult] = useState<DiagResult | null>(null)
  const [saindo, setSaindo] = useState(false)

  async function sair() {
    setSaindo(true)
    try {
      await signOut()
    } catch { /* segue para a tela de login mesmo assim */ }
    router.replace('/entrar')
  }

  useEffect(() => {
    const p = carregarPerfil()
    setNomeEmpresa(p.empresa || p.nome || 'OrçaFacil-Frio')
  }, [])

  async function rodarDiagnostico() {
    setDiagCarregando(true)
    setDiagResult(null)
    try {
      const r = await fetch('/api/ollama')
      const data = await r.json()
      setDiagResult(data)
    } catch (e) {
      setDiagResult({ online: false, erro: e instanceof Error ? e.message : 'Erro ao chamar /api/ollama' })
    } finally {
      setDiagCarregando(false)
    }
  }

  return (
    <>
      {/* Botão mobile — fica acima de tudo (z-70) e destacado em azul/primary */}
      <button
        className="fixed top-safe left-3 z-[70] flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-2 ring-background md:hidden"
        onClick={() => setAberto(!aberto)}
        aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
      >
        {aberto ? <X size={20} strokeWidth={2.4} /> : <Menu size={20} strokeWidth={2.4} />}
        {!aberto && <span className="text-xs font-bold leading-none">Menu</span>}
      </button>

      {/* Overlay mobile */}
      {aberto && (
        <div
          className="fixed inset-0 bg-black/60 z-[55] md:hidden"
          onClick={() => setAberto(false)}
        />
      )}

      {/* Sidebar — no mobile fica ACIMA da barra inferior (z maior) para não tapar o Sair */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-[60] flex flex-col pt-safe md:pt-0 pb-safe',
          'transition-transform duration-200',
          aberto ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0 md:static md:z-auto'
        )}
      >
        {/* Logo — clica para ir a aba Geral */}
        <button
          onClick={() => { onNavegar('dashboard'); setAberto(false) }}
          className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border w-full text-left hover:bg-sidebar-accent transition-colors"
          aria-label="Ir para aba Geral"
        >
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Thermometer size={20} className="text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-sidebar-foreground truncate leading-tight">
              OrçaFacil-Frio
            </p>
            <p className="text-xs text-muted-foreground truncate leading-tight">{nomeEmpresa}</p>
          </div>
        </button>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV.map(item => {
            const Icon = item.icon
            const ativo = paginaAtiva === item.id
            return (
              <button
                key={item.id}
                onClick={() => { onNavegar(item.id); setAberto(false) }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-colors',
                  ativo
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
                {ativo && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </button>
            )
          })}

          {/* Link do painel de administrador — só aparece para o dono */}
          {ehAdmin && (
            <button
              onClick={() => { router.push('/admin'); setAberto(false) }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-colors text-primary hover:bg-primary/10 mt-1"
            >
              <ShieldCheck size={18} className="flex-shrink-0" />
              <span className="text-sm font-medium">Admin</span>
            </button>
          )}
        </nav>

        {/* Status Ollama */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <div className="flex items-center gap-2">
            {ollamaOnline ? (
              <Wifi size={14} className="text-profit flex-shrink-0" />
            ) : (
              <WifiOff size={14} className="text-destructive flex-shrink-0" />
            )}
            <span className="text-xs text-muted-foreground">IA Local (Ollama)</span>
            <Badge
              variant="outline"
              onClick={() => { if (!ollamaOnline) { setMostrarDiag(!mostrarDiag) } }}
              className={cn(
                'ml-auto text-[10px] px-1.5 py-0',
                ollamaOnline
                  ? 'border-profit/40 text-profit'
                  : 'border-destructive/40 text-destructive cursor-pointer hover:bg-destructive/10'
              )}
            >
              {ollamaOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>

          {/* Painel de diagnostico — aparece ao clicar em Offline */}
          {!ollamaOnline && mostrarDiag && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-3 text-xs">

              {/* Checklist do que precisa estar rodando */}
              <div className="space-y-1.5">
                <p className="font-semibold text-foreground">Verifique no seu PC:</p>
                {[
                  'Ollama está aberto (ícone na bandeja)',
                  'ngrok rodando no CMD',
                  'CMD mostra: Forwarding https://jukebox-ambiguity-unclog.ngrok-free.dev',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-muted-foreground">
                    <CheckCircle2 size={11} className="mt-0.5 flex-shrink-0 text-muted-foreground/50" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Botao de diagnostico */}
              <button
                onClick={rodarDiagnostico}
                disabled={diagCarregando}
                className="flex items-center gap-1.5 text-primary hover:underline disabled:opacity-50"
              >
                {diagCarregando
                  ? <><Loader2 size={11} className="animate-spin" /> Testando conexao...</>
                  : <><RefreshCw size={11} /> Testar conexao agora</>
                }
              </button>

              {/* Resultado do diagnostico */}
              {diagResult && (
                <div className={cn(
                  'rounded-md p-2 space-y-1 border',
                  diagResult.online
                    ? 'bg-profit/10 border-profit/30 text-profit'
                    : 'bg-destructive/10 border-destructive/30 text-destructive'
                )}>
                  <div className="flex items-center gap-1.5 font-semibold">
                    {diagResult.online
                      ? <><CheckCircle2 size={11} /> Conectado!</>
                      : <><AlertCircle size={11} /> Erro de conexao</>
                    }
                  </div>
                  {diagResult.url && (
                    <p className="text-muted-foreground break-all">URL: {diagResult.url}</p>
                  )}
                  {diagResult.erro && (
                    <p className="break-all">{diagResult.erro}</p>
                  )}
                  {diagResult.detalhe && (
                    <p className="text-muted-foreground break-all opacity-70 text-[10px]">{diagResult.detalhe.slice(0, 120)}</p>
                  )}
                  {diagResult.online && diagResult.models && diagResult.models.length > 0 && (
                    <p className="text-muted-foreground">Modelos: {diagResult.models.join(', ')}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Botao Sair — encerra a sessao e volta para a tela de login */}
          <button
            onClick={sair}
            disabled={saindo}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50 mt-1"
          >
            {saindo
              ? <><Loader2 size={15} className="animate-spin" /> Saindo...</>
              : <><LogOut size={15} /> Sair</>
            }
          </button>
        </div>
      </aside>
    </>
  )
}
