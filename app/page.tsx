'use client'

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth-client'
import { Sidebar } from '@/components/layout/sidebar'
import { NavBottom } from '@/components/layout/nav-bottom'
import { Dashboard } from '@/components/telas/dashboard'
import { NovoOrcamento } from '@/components/telas/novo-orcamento'
import { Historico } from '@/components/telas/historico'
import { Perfil } from '@/components/telas/perfil'
import { BannerLicenca } from '@/components/auth/banner-licenca'
import { confirmarCheckout } from '@/lib/actions/licenca'
import { Loader2, CheckCircle2 } from 'lucide-react'
import type { EstadoChat } from '@/components/telas/novo-orcamento'
import type { Orcamento } from '@/lib/tipos'

type Pagina = 'dashboard' | 'novo-orcamento' | 'historico' | 'perfil'

export default function Home() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [pagina, setPagina] = useState<Pagina>('dashboard')
  const [ollamaOnline, setOllamaOnline] = useState(false)
  const [, setEstadoChat] = useState<EstadoChat | null>(null)
  const estadoChatRef = useRef<EstadoChat | null>(null)
  const [orcamentoParaEditar, setOrcamentoParaEditar] = useState<Orcamento | null>(null)
  const [edicaoNonce, setEdicaoNonce] = useState(0)
  const [abrirOrcId, setAbrirOrcId] = useState<string | null>(null)
  const [abrirOrcNonce, setAbrirOrcNonce] = useState(0)
  const [focarChatNonce, setFocarChatNonce] = useState(0)
  const [avisoPagamento, setAvisoPagamento] = useState<string | null>(null)
  const confirmandoRef = useRef(false)

  // ── Retorno do checkout Stripe ───────────────────────────────────────────
  // Ativa a licenca no retorno (dispensa webhook). Confirma a sessao paga no servidor.
  useEffect(() => {
    if (!session?.user || confirmandoRef.current) return
    const params = new URLSearchParams(window.location.search)
    const licenca = params.get('licenca')
    const sessionId = params.get('session_id')

    const limparUrl = () => window.history.replaceState({}, '', window.location.pathname)

    if (licenca === 'sucesso' && sessionId) {
      confirmandoRef.current = true
      confirmarCheckout(sessionId).then(res => {
        if (res.ok) {
          // Recarrega para o banner/limites refletirem o plano ativo, já com o aviso
          window.location.replace(`${window.location.pathname}?licenca=ativado`)
        } else {
          setAvisoPagamento(res.mensagem ?? 'Não foi possível confirmar o pagamento.')
          limparUrl()
          setTimeout(() => setAvisoPagamento(null), 6000)
        }
      })
    } else if (licenca === 'ativado') {
      setAvisoPagamento('Pagamento confirmado! Seu plano já está ativo.')
      limparUrl()
      setTimeout(() => setAvisoPagamento(null), 6000)
    } else if (licenca === 'cancelado') {
      setAvisoPagamento('Pagamento cancelado. Você pode assinar quando quiser.')
      limparUrl()
      setTimeout(() => setAvisoPagamento(null), 5000)
    }
  }, [session?.user])

  // ── Memória de rolagem por aba ──────────────────────────────────────────
  // Cada aba lembra onde o usuário parou. Aba nunca aberta começa no topo.
  const scrollRefs = useRef<Record<Pagina, HTMLDivElement | null>>({
    dashboard: null, 'novo-orcamento': null, historico: null, perfil: null,
  })
  const scrollMem = useRef<Record<Pagina, number>>({
    dashboard: 0, 'novo-orcamento': 0, historico: 0, perfil: 0,
  })
  const visitados = useRef<Set<Pagina>>(new Set())

  const salvarScroll = (p: Pagina) => {
    const el = scrollRefs.current[p]
    if (el) scrollMem.current[p] = el.scrollTop
  }

  // Restaura a posição ao trocar de aba (após o layout, sem flicker)
  useLayoutEffect(() => {
    const el = scrollRefs.current[pagina]
    if (!el) return
    if (visitados.current.has(pagina)) {
      el.scrollTop = scrollMem.current[pagina]
    } else {
      el.scrollTop = 0
      visitados.current.add(pagina)
    }
  }, [pagina])

  // Troca de aba salvando a rolagem da aba atual antes de sair
  const navegar = useCallback((p: Pagina) => {
    setPagina(prev => {
      const el = scrollRefs.current[prev]
      if (el) scrollMem.current[prev] = el.scrollTop
      return p
    })
  }, [])

  // Redireciona para /entrar se nao autenticado
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace('/entrar')
    }
  }, [isPending, session, router])

  // Verifica se Ollama esta online (URL centralizada no servidor)
  const verificarOllama = useCallback(async () => {
    try {
      const resp = await fetch('/api/ollama')
      const data = await resp.json()
      setOllamaOnline(data.online ?? false)
    } catch {
      setOllamaOnline(false)
    }
  }, [])

  useEffect(() => {
    if (!session?.user) return
    verificarOllama()
    const interval = setInterval(verificarOllama, 30000)
    return () => clearInterval(interval)
  }, [session?.user, verificarOllama])

  const handleEstadoChat = useCallback((estado: EstadoChat) => {
    estadoChatRef.current = estado
    setEstadoChat(estado)
  }, [])

  // Botão "IA" da barra inferior: vai direto ao chat da IA (fecha preview/drawer abertos)
  const handleAbrirIA = useCallback(() => {
    setFocarChatNonce(n => n + 1)
    navegar('novo-orcamento')
  }, [navegar])

  // Abre um orçamento (a partir dos recentes do dashboard) no histórico já selecionado
  const handleAbrirOrcamento = useCallback((orc: Orcamento) => {
    setAbrirOrcId(orc.id)
    setAbrirOrcNonce(n => n + 1)
    navegar('historico')
  }, [navegar])

  // Abre um orçamento antigo no chat da IA para editar (via nonce dedicado)
  const handleEditarNoChat = useCallback((orc: Orcamento) => {
    setOrcamentoParaEditar(orc)
    setEdicaoNonce(n => n + 1)
    navegar('novo-orcamento')
  }, [navegar])

  // Carregando sessao
  if (isPending || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      <Sidebar paginaAtiva={pagina} onNavegar={navegar} ollamaOnline={ollamaOnline} />

      <main className="flex-1 overflow-hidden flex flex-col pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))] md:pt-0 md:pb-0">
        {/* Aviso de retorno do pagamento */}
        {avisoPagamento && (
          <div className="mx-3 mt-2 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary" role="status">
            <CheckCircle2 size={14} className="shrink-0" />
            <span className="text-pretty">{avisoPagamento}</span>
          </div>
        )}

        {/* Banner de licenca/trial — aparece no topo de todas as telas */}
        <BannerLicenca />

        <div
          ref={el => { scrollRefs.current.dashboard = el }}
          onScroll={() => salvarScroll('dashboard')}
          className={pagina === 'dashboard' ? 'flex flex-col flex-1 overflow-y-auto' : 'hidden'}
        >
          <Dashboard
            onNovoOrcamento={() => navegar('novo-orcamento')}
            onAbrirHistorico={() => navegar('historico')}
            onAbrirOrcamento={handleAbrirOrcamento}
          />
        </div>
        <div
          ref={el => { scrollRefs.current['novo-orcamento'] = el }}
          className={pagina === 'novo-orcamento' ? 'flex flex-col flex-1 overflow-hidden' : 'hidden'}
        >
          <NovoOrcamento
            ollamaOnline={ollamaOnline}
            estadoInicial={estadoChatRef.current}
            onEstadoChange={handleEstadoChat}
            orcamentoParaEditar={orcamentoParaEditar}
            edicaoNonce={edicaoNonce}
            focarChatNonce={focarChatNonce}
          />
        </div>
        <div
          ref={el => { scrollRefs.current.historico = el }}
          onScroll={() => salvarScroll('historico')}
          className={pagina === 'historico' ? 'flex flex-col flex-1 overflow-y-auto' : 'hidden'}
        >
          <Historico onEditarNoChat={handleEditarNoChat} abrirId={abrirOrcId} abrirNonce={abrirOrcNonce} />
        </div>
        <div
          ref={el => { scrollRefs.current.perfil = el }}
          onScroll={() => salvarScroll('perfil')}
          className={pagina === 'perfil' ? 'flex flex-col flex-1 overflow-y-auto' : 'hidden'}
        >
          <Perfil onOllamaStatus={setOllamaOnline} />
        </div>
      </main>

      <NavBottom paginaAtiva={pagina} onNavegar={navegar} onAbrirIA={handleAbrirIA} />
    </div>
  )
}
